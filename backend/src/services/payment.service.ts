import { prisma } from "../config/database.js";
import { momoService } from "./momo.service.js";
import { paystackService } from "./paystack.service.js";
import { emailService } from "./email.service.js";

export class PaymentService {
  async creditSellerWallets(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sellerOrders: {
          include: {
            seller: { include: { wallet: true } },
          },
        },
      },
    });

    if (!order) return;

    for (const sellerOrder of order.sellerOrders) {
      const wallet = sellerOrder.seller?.wallet;
      if (!wallet) continue;

      const payoutAmount = sellerOrder.payoutAmountInPesewas;

      await prisma.$transaction([
        prisma.sellerWallet.update({
          where: { id: wallet.id },
          data: {
            pendingBalance: { increment: payoutAmount },
            totalEarned: { increment: payoutAmount },
          },
        }),
        prisma.transaction.create({
          data: {
            walletId: wallet.id,
            type: "SALE",
            amount: payoutAmount,
            balanceBefore: wallet.pendingBalance,
            balanceAfter: wallet.pendingBalance + payoutAmount,
            description: `Sale from order ${order.orderNumber}`,
            referenceId: sellerOrder.id,
          },
        }),
      ]);
    }
  }

  async sendPaymentConfirmationEmail(orderId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: { select: { email: true, firstName: true } },
          payment: true,
        },
      });

      if (!order || !order.user?.email) return;

      const amountInCedis = (order.totalInPesewas / 100).toFixed(2);

      await emailService.sendPaymentConfirmationEmail(
        order.user.email,
        order.user.firstName || "there",
        order.orderNumber,
        amountInCedis,
        order.payment?.method || "N/A",
      );
    } catch (error) {
      console.error("Payment email error:", error);
    }
  }

  async initializeMomoPayment(
    orderId: string,
    phoneNumber: string,
    userId: string,
  ) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: { in: ["PENDING", "PAYMENT_PENDING"] },
      },
      include: { payment: true },
    });

    if (!order) {
      throw new Error("Order not found or already paid");
    }
    if (order.payment?.status === "PROCESSING") {
      throw new Error("Payment already in progress");
    }

    const formattedPhone = momoService.formatPhoneNumber(phoneNumber);
    const momoResponse = await momoService.requestToPay({
      amount: order.totalInPesewas,
      currency: "GHS",
      externalId: order.orderNumber,
      payer: { partyIdType: "MSISDN", partyId: formattedPhone },
      payerMessage: `Payment for order ${order.orderNumber}`,
      payeeNote: "GhanaMarket order",
    });

    const payment = await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        status: "PROCESSING",
        gatewayProvider: "mtn_momo",
        gatewayReference: momoResponse.referenceId,
        momoPhoneNumber: phoneNumber,
        initiatedAt: new Date(),
      },
      create: {
        orderId: order.id,
        amountInPesewas: order.totalInPesewas,
        method: "MOMO_MTN",
        status: "PROCESSING",
        gatewayProvider: "mtn_momo",
        gatewayReference: momoResponse.referenceId,
        momoPhoneNumber: phoneNumber,
        momoNetwork: "MTN",
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAYMENT_PENDING" },
    });

    return {
      paymentId: payment.id,
      reference: momoResponse.referenceId,
      amount: order.totalInPesewas / 100,
      provider: "mtn_momo",
    };
  }

  async verifyMomoPayment(reference: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: { gatewayReference: reference },
      include: {
        order: { select: { id: true, orderNumber: true, userId: true } },
      },
    });

    if (!payment || payment.order.userId !== userId) {
      throw new Error("Payment not found");
    }

    if (payment.status === "PROCESSING") {
      const momoStatus = await momoService.getPaymentStatus(reference);
      if (momoStatus.status === "SUCCESSFUL") {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: "SUCCESS", confirmedAt: new Date() },
          }),
          prisma.order.update({
            where: { id: payment.order.id },
            data: { status: "CONFIRMED", confirmedAt: new Date() },
          }),
        ]);
        this.creditSellerWallets(payment.order.id).catch(console.error);
        return { status: "SUCCESS", orderNumber: payment.order.orderNumber };
      } else if (momoStatus.status === "FAILED") {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED", failedAt: new Date() },
          }),
          prisma.order.update({
            where: { id: payment.order.id },
            data: { status: "FAILED" },
          }),
        ]);
        return { status: "FAILED" };
      }
    }
    return { status: payment.status, orderNumber: payment.order.orderNumber };
  }

  async initializePaystackPayment(
    orderId: string,
    email: string,
    callbackUrl: string | undefined,
    paymentMethod: string,
    mobileMoneyProvider: string | undefined,
    mobileMoneyNumber: string | undefined,
    userId: string,
  ) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: { in: ["PENDING", "PAYMENT_PENDING"] },
      },
      include: { payment: true },
    });

    if (!order) {
      throw new Error("Order not found");
    }
    if (order.payment?.status === "PROCESSING") {
      throw new Error("Payment already in progress");
    }
    if (
      paymentMethod === "mobile_money" &&
      (!mobileMoneyProvider || !mobileMoneyNumber)
    ) {
      throw new Error(
        "Mobile money provider and phone number are required for MoMo payments",
      );
    }

    const reference = paystackService.generateReference();

    const paystackRequest: any = {
      email,
      amount: order.totalInPesewas,
      reference,
      currency: "GHS",
      callback_url: callbackUrl,
      metadata: {
        orderId: order.id,
        userId,
        paymentMethod,
        custom_fields: [
          {
            display_name: "Order Number",
            variable_name: "order_number",
            value: order.orderNumber,
          },
        ],
      },
    };

    if (paymentMethod === "mobile_money") {
      paystackRequest.channels = ["mobile_money"];
    } else {
      paystackRequest.channels = ["card"];
    }

    const paystackResponse =
      await paystackService.initializeTransaction(paystackRequest);

    if (!paystackResponse.status) {
      throw new Error(paystackResponse.message);
    }

    let method: string = "CARD";
    if (paymentMethod === "mobile_money") {
      const providerMap: Record<string, string> = {
        mtn: "MOMO_MTN",
        telecel: "MOMO_VODAFONE",
        vodafone: "MOMO_VODAFONE",
        airteltigo: "MOMO_AIRTELTIGO",
      };
      method = providerMap[mobileMoneyProvider || "mtn"] || "MOMO_MTN";
    }

    const payment = await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        status: "PROCESSING",
        method: method as any,
        gatewayProvider: "paystack",
        gatewayReference: reference,
        momoPhoneNumber: mobileMoneyNumber || null,
        momoNetwork: mobileMoneyProvider?.toUpperCase() || null,
        initiatedAt: new Date(),
      },
      create: {
        orderId: order.id,
        amountInPesewas: order.totalInPesewas,
        method: method as any,
        status: "PROCESSING",
        gatewayProvider: "paystack",
        gatewayReference: reference,
        momoPhoneNumber: mobileMoneyNumber || null,
        momoNetwork: mobileMoneyProvider?.toUpperCase() || null,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAYMENT_PENDING" },
    });

    return {
      paymentId: payment.id,
      reference,
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
      amount: order.totalInPesewas / 100,
      provider: "paystack",
      paymentMethod,
    };
  }

  async verifyPaystackPayment(reference: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: { gatewayReference: reference },
      include: {
        order: { select: { id: true, orderNumber: true, userId: true } },
      },
    });

    if (!payment || payment.order.userId !== userId) {
      throw new Error("Payment not found");
    }

    const paystackResponse = await paystackService.verifyTransaction(reference);

    if (paystackResponse.data.status === "success") {
      let method = payment.method;
      if (paystackResponse.data.channel === "mobile_money")
        method = "MOMO_MTN" as any;
      else if (paystackResponse.data.channel === "card") method = "CARD" as any;

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            confirmedAt: new Date(),
            method: method as any,
            gatewayResponse: paystackResponse.data as any,
            cardLast4: paystackResponse.data.authorization?.last4 || null,
            cardBrand: paystackResponse.data.authorization?.card_type || null,
          },
        }),
        prisma.order.update({
          where: { id: payment.order.id },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        }),
      ]);

      this.creditSellerWallets(payment.order.id).catch(console.error);
      this.sendPaymentConfirmationEmail(payment.order.id).catch(console.error);

      return {
        status: "SUCCESS",
        orderNumber: payment.order.orderNumber,
        channel: paystackResponse.data.channel,
        cardLast4: paystackResponse.data.authorization?.last4,
      };
    } else if (paystackResponse.data.status === "failed") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            failureReason: paystackResponse.data.gateway_response,
            gatewayResponse: paystackResponse.data as any,
          },
        }),
        prisma.order.update({
          where: { id: payment.order.id },
          data: { status: "FAILED" },
        }),
      ]);
      return {
        status: "FAILED",
        message: paystackResponse.data.gateway_response,
      };
    }

    return {
      status: paystackResponse.data.status.toUpperCase(),
      orderNumber: payment.order.orderNumber,
    };
  }

  async handlePaystackWebhook(event: any) {
    if (event.event === "charge.success") {
      const { reference } = event.data;
      const payment = await prisma.payment.findFirst({
        where: { gatewayReference: reference },
        include: { order: true },
      });
      if (!payment || payment.status === "SUCCESS") return;

      let method = payment.method;
      if (event.data.channel === "mobile_money") method = "MOMO_MTN" as any;
      else if (event.data.channel === "card") method = "CARD" as any;

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            confirmedAt: event.data.paid_at
              ? new Date(event.data.paid_at)
              : new Date(),
            method: method as any,
            gatewayResponse: event.data,
            cardLast4: event.data.authorization?.last4 || null,
            cardBrand: event.data.authorization?.card_type || null,
          },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        }),
      ]);
      await this.creditSellerWallets(payment.orderId).catch(console.error);
      await this.sendPaymentConfirmationEmail(payment.orderId).catch(
        console.error,
      );
    } else if (event.event === "charge.failed") {
      const { reference } = event.data;
      const payment = await prisma.payment.findFirst({
        where: { gatewayReference: reference },
      });
      if (!payment || payment.status === "FAILED") return;
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            failureReason: event.data.gateway_response || "Payment failed",
            gatewayResponse: event.data,
          },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "FAILED" },
        }),
      ]);
    } else if (event.event === "transfer.success") {
      const { reference, transfer_code } = event.data;
      const payout = await prisma.payout.findFirst({
        where: {
          OR: [
            { transactionReference: reference },
            { transactionReference: transfer_code },
          ],
        },
      });
      if (!payout || payout.status === "PAID") return;
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: "PAID", processedAt: new Date() },
      });
    } else if (event.event === "transfer.failed") {
      const { reference, transfer_code, reason } = event.data;
      const payout = await prisma.payout.findFirst({
        where: {
          OR: [
            { transactionReference: reference },
            { transactionReference: transfer_code },
          ],
        },
        include: { seller: { include: { wallet: true } } },
      });
      if (!payout || payout.status === "FAILED") return;
      if (payout.seller?.wallet) {
        await prisma.$transaction([
          prisma.payout.update({
            where: { id: payout.id },
            data: { status: "FAILED", notes: reason || "Transfer failed" },
          }),
          prisma.sellerWallet.update({
            where: { id: payout.seller.wallet.id },
            data: {
              currentBalance: { increment: payout.amount },
              totalWithdrawn: { decrement: payout.amount },
            },
          }),
          prisma.transaction.create({
            data: {
              walletId: payout.seller.wallet.id,
              type: "ADJUSTMENT",
              amount: payout.amount,
              balanceBefore: payout.seller.wallet.currentBalance,
              balanceAfter: payout.seller.wallet.currentBalance + payout.amount,
              description: `Payout refund — transfer failed: ${reason || "Unknown"}`,
              referenceId: payout.id,
            },
          }),
        ]);
      }
    }
  }

  async cancelPayment(paymentId: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        status: { in: ["PENDING", "PROCESSING"] },
        order: { userId },
      },
    });
    if (!payment) throw new Error("Cannot cancel payment");
    if (payment.gatewayProvider === "mtn_momo" && payment.gatewayReference) {
      momoService.cancelPayment(payment.gatewayReference);
    }
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: { status: "CANCELLED" },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "PENDING" },
      }),
    ]);
  }

  async processRefund(
    orderId: string,
    reason: string,
    amountInPesewas: number | undefined,
    adminUserId: string,
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        sellerOrders: { include: { seller: { include: { wallet: true } } } },
        items: true,
      },
    });

    if (!order) throw new Error("Order not found");
    if (!order.payment || order.payment.status !== "SUCCESS")
      throw new Error("No successful payment to refund");

    const refundAmount = amountInPesewas || order.payment.amountInPesewas;
    const existingRefunds = await prisma.refund.aggregate({
      where: {
        paymentId: order.payment.id,
        status: { in: ["PENDING", "SUCCESS"] },
      },
      _sum: { amountInPesewas: true },
    });
    const totalRefunded = existingRefunds._sum.amountInPesewas || 0;
    const maxRefundable = order.payment.amountInPesewas - totalRefunded;

    if (refundAmount > maxRefundable)
      throw new Error(
        `Maximum refundable amount is ${(maxRefundable / 100).toFixed(2)}`,
      );

    const refund = await prisma.refund.create({
      data: {
        paymentId: order.payment.id,
        amountInPesewas: refundAmount,
        reason,
        status: "PENDING",
      },
    });

    let gatewaySuccess = false;
    if (
      order.payment.gatewayReference &&
      order.payment.gatewayProvider === "paystack"
    ) {
      gatewaySuccess = await paystackService.createRefund(
        order.payment.gatewayReference,
        refundAmount,
      );
    } else {
      gatewaySuccess = true;
    }

    if (gatewaySuccess) {
      await prisma.$transaction(async (tx) => {
        await tx.refund.update({
          where: { id: refund.id },
          data: {
            status: "SUCCESS",
            processedAt: new Date(),
            gatewayReference: order.payment?.gatewayReference || null,
          },
        });
        if (refundAmount >= order.payment!.amountInPesewas) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "REFUNDED" },
          });
          await tx.sellerOrder.updateMany({
            where: { orderId },
            data: { status: "REFUNDED" },
          });
        }
        for (const sellerOrder of order.sellerOrders) {
          if (!sellerOrder.seller?.wallet) continue;
          const sellerRefundPortion = Math.round(
            (refundAmount * sellerOrder.payoutAmountInPesewas) /
              order.totalInPesewas,
          );
          if (sellerRefundPortion > 0) {
            const wallet = sellerOrder.seller.wallet;
            await tx.sellerWallet.update({
              where: { id: wallet.id },
              data: {
                pendingBalance: {
                  decrement: Math.min(
                    sellerRefundPortion,
                    wallet.pendingBalance,
                  ),
                },
                totalEarned: { decrement: sellerRefundPortion },
              },
            });
            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                type: "REFUND",
                amount: -sellerRefundPortion,
                balanceBefore: wallet.pendingBalance,
                balanceAfter: wallet.pendingBalance - sellerRefundPortion,
                description: `Refund for order #${order.orderNumber}: ${reason}`,
                referenceId: refund.id,
              },
            });
          }
        }
        if (refundAmount >= order.payment!.amountInPesewas) {
          for (const item of order.items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });
            if (product?.trackInventory) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stockQuantity: { increment: item.quantity } },
              });
              await tx.inventoryLog.create({
                data: {
                  productId: item.productId,
                  action: "RETURN",
                  quantityChange: item.quantity,
                  previousQuantity: product.stockQuantity,
                  newQuantity: product.stockQuantity + item.quantity,
                  orderId,
                  userId: adminUserId,
                  notes: `Refund: ${reason}`,
                },
              });
            }
          }
        }
      });
      return {
        refundId: refund.id,
        amountInCedis: refundAmount / 100,
        status: "SUCCESS",
      };
    } else {
      await prisma.refund.update({
        where: { id: refund.id },
        data: { status: "FAILED" },
      });
      throw new Error(
        "Refund processing failed at payment gateway. Please try again.",
      );
    }
  }

  async getRefundsForOrder(orderId: string, user: any) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...(user.role !== "SUPERADMIN" ? { userId: user.id } : {}),
      },
      include: { payment: true },
    });
    if (!order || !order.payment) throw new Error("Order not found");
    const refunds = await prisma.refund.findMany({
      where: { paymentId: order.payment.id },
      orderBy: { createdAt: "desc" },
    });
    return refunds.map((r) => ({
      id: r.id,
      amountInCedis: r.amountInPesewas / 100,
      reason: r.reason,
      status: r.status,
      processedAt: r.processedAt,
      createdAt: r.createdAt,
    }));
  }

  async getAllRefunds(page: number, limit: number) {
    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        include: {
          payment: {
            select: {
              orderId: true,
              method: true,
              order: { select: { orderNumber: true, customerEmail: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.refund.count(),
    ]);
    return {
      refunds: refunds.map((r) => ({
        id: r.id,
        orderNumber: r.payment.order.orderNumber,
        customerEmail: r.payment.order.customerEmail,
        amountInCedis: r.amountInPesewas / 100,
        reason: r.reason,
        status: r.status,
        paymentMethod: r.payment.method,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getPaymentForOrder(orderId: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: { orderId, order: { userId } },
      include: { order: { select: { orderNumber: true, status: true } } },
    });
    if (!payment) throw new Error("Payment not found");
    return {
      id: payment.id,
      status: payment.status,
      method: payment.method,
      provider: payment.gatewayProvider,
      amount: payment.amountInPesewas / 100,
      reference: payment.gatewayReference,
      orderNumber: payment.order.orderNumber,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      momoNetwork: payment.momoNetwork,
      momoPhoneNumber: payment.momoPhoneNumber,
      confirmedAt: payment.confirmedAt,
      failureReason: payment.failureReason,
    };
  }

  async getPaymentHistory(userId: string, page: number, limit: number) {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { order: { userId } },
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
              totalInPesewas: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.payment.count({ where: { order: { userId } } }),
    ]);
    return {
      payments: payments.map((p) => ({
        id: p.id,
        orderNumber: p.order.orderNumber,
        amount: p.amountInPesewas / 100,
        method: p.method,
        provider: p.gatewayProvider,
        status: p.status,
        reference: p.gatewayReference,
        cardLast4: p.cardLast4,
        momoNetwork: p.momoNetwork,
        confirmedAt: p.confirmedAt,
        createdAt: p.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

export const paymentService = new PaymentService();
