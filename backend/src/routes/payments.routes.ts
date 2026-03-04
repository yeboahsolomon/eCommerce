import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { paymentLimiter } from '../middleware/rate-limit.middleware.js';
import { momoService } from '../services/momo.service.js';
import { paystackService } from '../services/paystack.service.js';
import { emailService } from '../services/email.service.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const momoPaymentSchema = z.object({
  orderId: z.string().cuid('Invalid order ID'),
  phoneNumber: z.string().regex(
    /^0(24|54|55|59)\d{7}$/,
    'Invalid MTN Ghana phone number'
  ),
});

const paystackPaymentSchema = z.object({
  orderId: z.string().cuid('Invalid order ID'),
  email: z.string().email('Valid email required'),
  callbackUrl: z.string().url().optional(),
  paymentMethod: z.enum(['card', 'mobile_money']).optional().default('card'),
  mobileMoneyProvider: z.enum(['mtn', 'telecel', 'vodafone', 'airteltigo']).optional(),
  mobileMoneyNumber: z.string().regex(/^0\d{9}$/, 'Invalid Ghana phone number').optional(),
});

// ==================== MTN MOMO (Direct) ====================

router.post(
  '/momo/initialize',
  authMiddleware,
  paymentLimiter,
  validate(momoPaymentSchema),
  async (req: Request, res: Response) => {
    try {
      const { orderId, phoneNumber } = req.body;
      const userId = (req as any).user.id;

      const order = await prisma.order.findFirst({
        where: { id: orderId, userId, status: { in: ['PENDING', 'PAYMENT_PENDING'] } },
        include: { payment: true },
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found or already paid' });
      }

      if (order.payment?.status === 'PROCESSING') {
        return res.status(400).json({ success: false, message: 'Payment already in progress' });
      }

      const formattedPhone = momoService.formatPhoneNumber(phoneNumber);
      const momoResponse = await momoService.requestToPay({
        amount: order.totalInPesewas,
        currency: 'GHS',
        externalId: order.orderNumber,
        payer: { partyIdType: 'MSISDN', partyId: formattedPhone },
        payerMessage: `Payment for order ${order.orderNumber}`,
        payeeNote: 'GhanaMarket order',
      });

      const payment = await prisma.payment.upsert({
        where: { orderId: order.id },
        update: { status: 'PROCESSING', gatewayProvider: 'mtn_momo', gatewayReference: momoResponse.referenceId, momoPhoneNumber: phoneNumber, initiatedAt: new Date() },
        create: { orderId: order.id, amountInPesewas: order.totalInPesewas, method: 'MOMO_MTN', status: 'PROCESSING', gatewayProvider: 'mtn_momo', gatewayReference: momoResponse.referenceId, momoPhoneNumber: phoneNumber, momoNetwork: 'MTN' },
      });

      await prisma.order.update({ where: { id: order.id }, data: { status: 'PAYMENT_PENDING' } });

      res.json({
        success: true,
        message: 'Approve the payment on your phone',
        data: { paymentId: payment.id, reference: momoResponse.referenceId, amount: order.totalInPesewas / 100, provider: 'mtn_momo' },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Payment failed' });
    }
  }
);

router.get('/momo/verify/:reference', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const userId = (req as any).user.id;

    const payment = await prisma.payment.findFirst({
      where: { gatewayReference: reference },
      include: { order: { select: { id: true, orderNumber: true, userId: true } } },
    });

    if (!payment || payment.order.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status === 'PROCESSING') {
      const momoStatus = await momoService.getPaymentStatus(reference);
      if (momoStatus.status === 'SUCCESSFUL') {
        await prisma.$transaction([
          prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS', confirmedAt: new Date() } }),
          prisma.order.update({ where: { id: payment.order.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } }),
        ]);
        // Credit seller wallets asynchronously
        creditSellerWallets(payment.order.id).catch(console.error);
        return res.json({ success: true, data: { status: 'SUCCESS', orderNumber: payment.order.orderNumber } });
      } else if (momoStatus.status === 'FAILED') {
        await prisma.$transaction([
          prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failedAt: new Date() } }),
          prisma.order.update({ where: { id: payment.order.id }, data: { status: 'FAILED' } }),
        ]);
        return res.json({ success: false, data: { status: 'FAILED' } });
      }
    }

    res.json({ success: true, data: { status: payment.status, orderNumber: payment.order.orderNumber } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ==================== PAYSTACK (Card + Mobile Money) ====================

router.post(
  '/paystack/initialize',
  authMiddleware,
  paymentLimiter,
  validate(paystackPaymentSchema),
  async (req: Request, res: Response) => {
    try {
      const { orderId, email, callbackUrl, paymentMethod, mobileMoneyProvider, mobileMoneyNumber } = req.body;
      const userId = (req as any).user.id;

      const order = await prisma.order.findFirst({
        where: { id: orderId, userId, status: { in: ['PENDING', 'PAYMENT_PENDING'] } },
        include: { payment: true },
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.payment?.status === 'PROCESSING') {
        return res.status(400).json({ success: false, message: 'Payment already in progress' });
      }

      // Validate: if mobile_money selected, require provider and phone
      if (paymentMethod === 'mobile_money' && (!mobileMoneyProvider || !mobileMoneyNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Mobile money provider and phone number are required for MoMo payments',
        });
      }

      const reference = paystackService.generateReference();

      // Build Paystack request with channel routing
      const paystackRequest: any = {
        email,
        amount: order.totalInPesewas,
        reference,
        currency: 'GHS',
        callback_url: callbackUrl,
        metadata: {
          orderId: order.id,
          userId,
          paymentMethod,
          custom_fields: [
            {
              display_name: 'Order Number',
              variable_name: 'order_number',
              value: order.orderNumber,
            },
          ],
        },
      };

      // Set channel based on payment method
      if (paymentMethod === 'mobile_money') {
        paystackRequest.channels = ['mobile_money'];
        // Note: Paystack handles MoMo provider selection on their checkout page
        // The provider and phone are stored for our records
      } else {
        paystackRequest.channels = ['card'];
      }

      const paystackResponse = await paystackService.initializeTransaction(paystackRequest);

      if (!paystackResponse.status) {
        return res.status(400).json({ success: false, message: paystackResponse.message });
      }

      // Determine the payment method enum
      let method: string = 'CARD';
      if (paymentMethod === 'mobile_money') {
        const providerMap: Record<string, string> = {
          mtn: 'MOMO_MTN',
          telecel: 'MOMO_VODAFONE',
          vodafone: 'MOMO_VODAFONE',
          airteltigo: 'MOMO_AIRTELTIGO',
        };
        method = providerMap[mobileMoneyProvider || 'mtn'] || 'MOMO_MTN';
      }

      const payment = await prisma.payment.upsert({
        where: { orderId: order.id },
        update: {
          status: 'PROCESSING',
          method: method as any,
          gatewayProvider: 'paystack',
          gatewayReference: reference,
          momoPhoneNumber: mobileMoneyNumber || null,
          momoNetwork: mobileMoneyProvider?.toUpperCase() || null,
          initiatedAt: new Date(),
        },
        create: {
          orderId: order.id,
          amountInPesewas: order.totalInPesewas,
          method: method as any,
          status: 'PROCESSING',
          gatewayProvider: 'paystack',
          gatewayReference: reference,
          momoPhoneNumber: mobileMoneyNumber || null,
          momoNetwork: mobileMoneyProvider?.toUpperCase() || null,
        },
      });

      await prisma.order.update({ where: { id: order.id }, data: { status: 'PAYMENT_PENDING' } });

      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          reference,
          authorizationUrl: paystackResponse.data.authorization_url,
          accessCode: paystackResponse.data.access_code,
          amount: order.totalInPesewas / 100,
          provider: 'paystack',
          paymentMethod,
        },
      });
    } catch (error: any) {
      console.error('Paystack init error:', error);
      res.status(500).json({ success: false, message: error.message || 'Payment failed' });
    }
  }
);

// ==================== PAYSTACK VERIFY ====================

router.get('/paystack/verify/:reference', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const userId = (req as any).user.id;

    const payment = await prisma.payment.findFirst({
      where: { gatewayReference: reference },
      include: { order: { select: { id: true, orderNumber: true, userId: true } } },
    });

    if (!payment || payment.order.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const paystackResponse = await paystackService.verifyTransaction(reference);

    if (paystackResponse.data.status === 'success') {
      // Determine method from Paystack channel
      let method = payment.method;
      if (paystackResponse.data.channel === 'mobile_money') {
        method = 'MOMO_MTN' as any; // Default; could be refined from authorization data
      } else if (paystackResponse.data.channel === 'card') {
        method = 'CARD' as any;
      }

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            confirmedAt: new Date(),
            method: method as any,
            gatewayResponse: paystackResponse.data as any,
            // Store card details if available
            cardLast4: paystackResponse.data.authorization?.last4 || null,
            cardBrand: paystackResponse.data.authorization?.card_type || null,
          },
        }),
        prisma.order.update({
          where: { id: payment.order.id },
          data: { status: 'CONFIRMED', confirmedAt: new Date() },
        }),
      ]);

      // Credit seller wallets asynchronously
      creditSellerWallets(payment.order.id).catch(console.error);

      // Send confirmation email asynchronously
      sendPaymentConfirmationEmail(payment.order.id).catch(console.error);

      return res.json({
        success: true,
        data: {
          status: 'SUCCESS',
          orderNumber: payment.order.orderNumber,
          channel: paystackResponse.data.channel,
          cardLast4: paystackResponse.data.authorization?.last4,
        },
      });
    } else if (paystackResponse.data.status === 'failed') {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: paystackResponse.data.gateway_response,
            gatewayResponse: paystackResponse.data as any,
          },
        }),
        prisma.order.update({ where: { id: payment.order.id }, data: { status: 'FAILED' } }),
      ]);
      return res.json({ success: false, data: { status: 'FAILED', message: paystackResponse.data.gateway_response } });
    }

    res.json({ success: true, data: { status: paystackResponse.data.status.toUpperCase(), orderNumber: payment.order.orderNumber } });
  } catch (error: any) {
    console.error('Paystack verify error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ==================== PAYSTACK WEBHOOK ====================

router.post('/paystack/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    if (!paystackService.verifyWebhookSignature(JSON.stringify(req.body), signature)) {
      console.warn('⚠️ Invalid Paystack webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = req.body;
    console.log(`📬 Paystack webhook: ${event.event}`, { reference: event.data?.reference });

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;

      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;

      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;

      default:
        console.log(`Unhandled Paystack event: ${event.event}`);
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Paystack retries on our errors
    res.status(200).json({ received: true });
  }
});

// ==================== WEBHOOK HANDLERS ====================

async function handleChargeSuccess(data: any) {
  const { reference } = data;

  // Idempotency check — don't process twice
  const payment = await prisma.payment.findFirst({
    where: { gatewayReference: reference },
    include: { order: true },
  });

  if (!payment) {
    console.warn(`Webhook: No payment found for reference ${reference}`);
    return;
  }

  if (payment.status === 'SUCCESS') {
    console.log(`Webhook: Payment ${reference} already processed, skipping`);
    return;
  }

  // Determine method from channel
  let method = payment.method;
  if (data.channel === 'mobile_money') {
    method = 'MOMO_MTN' as any;
  } else if (data.channel === 'card') {
    method = 'CARD' as any;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        confirmedAt: data.paid_at ? new Date(data.paid_at) : new Date(),
        method: method as any,
        gatewayResponse: data,
        cardLast4: data.authorization?.last4 || null,
        cardBrand: data.authorization?.card_type || null,
      },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    }),
  ]);

  // Credit seller wallets
  await creditSellerWallets(payment.orderId).catch((err) =>
    console.error('Webhook: wallet credit error:', err)
  );

  // Send confirmation email
  await sendPaymentConfirmationEmail(payment.orderId).catch((err) =>
    console.error('Webhook: email error:', err)
  );

  console.log(`✅ Webhook: Payment ${reference} confirmed`);
}

async function handleChargeFailed(data: any) {
  const { reference } = data;

  const payment = await prisma.payment.findFirst({
    where: { gatewayReference: reference },
  });

  if (!payment || payment.status === 'FAILED') return;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: data.gateway_response || 'Payment failed',
        gatewayResponse: data,
      },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'FAILED' },
    }),
  ]);

  console.log(`❌ Webhook: Payment ${reference} failed: ${data.gateway_response}`);
}

async function handleTransferSuccess(data: any) {
  const { reference, transfer_code } = data;

  const payout = await prisma.payout.findFirst({
    where: {
      OR: [
        { transactionReference: reference },
        { transactionReference: transfer_code },
      ],
    },
  });

  if (!payout || payout.status === 'PAID') return;

  await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: 'PAID',
      processedAt: new Date(),
    },
  });

  console.log(`✅ Webhook: Payout ${payout.id} completed`);
}

async function handleTransferFailed(data: any) {
  const { reference, transfer_code, reason } = data;

  const payout = await prisma.payout.findFirst({
    where: {
      OR: [
        { transactionReference: reference },
        { transactionReference: transfer_code },
      ],
    },
    include: { seller: { include: { wallet: true } } },
  });

  if (!payout || payout.status === 'FAILED') return;

  // Refund the seller's wallet balance
  if (payout.seller?.wallet) {
    await prisma.$transaction([
      prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'FAILED', notes: reason || 'Transfer failed' },
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
          type: 'ADJUSTMENT',
          amount: payout.amount,
          balanceBefore: payout.seller.wallet.currentBalance,
          balanceAfter: payout.seller.wallet.currentBalance + payout.amount,
          description: `Payout refund — transfer failed: ${reason || 'Unknown'}`,
          referenceId: payout.id,
        },
      }),
    ]);
  }

  console.log(`❌ Webhook: Payout ${payout.id} failed: ${reason}`);
}

// ==================== HELPER: CREDIT SELLER WALLETS ====================

async function creditSellerWallets(orderId: string) {
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
      // Credit pending balance (moves to current on delivery)
      prisma.sellerWallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { increment: payoutAmount },
          totalEarned: { increment: payoutAmount },
        },
      }),
      // Log the transaction
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'SALE',
          amount: payoutAmount,
          balanceBefore: wallet.pendingBalance,
          balanceAfter: wallet.pendingBalance + payoutAmount,
          description: `Sale from order ${order.orderNumber}`,
          referenceId: sellerOrder.id,
        },
      }),
    ]);
  }

  console.log(`💰 Credited wallets for order ${order.orderNumber}`);
}

// ==================== HELPER: PAYMENT CONFIRMATION EMAIL ====================

async function sendPaymentConfirmationEmail(orderId: string) {
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
      order.user.firstName || 'there',
      order.orderNumber,
      amountInCedis,
      order.payment?.method || 'N/A',
    );
  } catch (error) {
    console.error('Payment email error:', error);
  }
}

// ==================== PAYSTACK CONFIG & BANKS ====================

router.get('/paystack/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      publicKey: paystackService.getPublicKey(),
      currency: 'GHS',
      channels: ['card', 'mobile_money'],
      momoProviders: [
        { id: 'mtn', name: 'MTN Mobile Money', code: 'MPS' },
        { id: 'telecel', name: 'Telecel Cash (Vodafone)', code: 'VDF' },
        { id: 'airteltigo', name: 'AirtelTigo Money', code: 'ATL' },
      ],
    },
  });
});

router.get('/paystack/banks', async (req: Request, res: Response) => {
  const banks = await paystackService.getBanks();
  res.json({ success: true, data: { banks } });
});

// ==================== SHARED ENDPOINTS ====================

// Get payment for a specific order
router.get('/order/:orderId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = (req as any).user.id;

    const payment = await prisma.payment.findFirst({
      where: { orderId, order: { userId } },
      include: { order: { select: { orderNumber: true, status: true } } },
    });

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    res.json({
      success: true,
      data: {
        id: payment.id, status: payment.status, method: payment.method, provider: payment.gatewayProvider,
        amount: payment.amountInPesewas / 100, reference: payment.gatewayReference, orderNumber: payment.order.orderNumber,
        cardLast4: payment.cardLast4, cardBrand: payment.cardBrand,
        momoNetwork: payment.momoNetwork, momoPhoneNumber: payment.momoPhoneNumber,
        confirmedAt: payment.confirmedAt, failureReason: payment.failureReason,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payment' });
  }
});

// Payment history for authenticated user
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { order: { userId } },
        include: {
          order: { select: { orderNumber: true, status: true, totalInPesewas: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.payment.count({ where: { order: { userId } } }),
    ]);

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payment history' });
  }
});

// Cancel payment
router.post('/:paymentId/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = (req as any).user.id;

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, status: { in: ['PENDING', 'PROCESSING'] }, order: { userId } },
    });

    if (!payment) return res.status(404).json({ success: false, message: 'Cannot cancel payment' });

    if (payment.gatewayProvider === 'mtn_momo' && payment.gatewayReference) {
      momoService.cancelPayment(payment.gatewayReference);
    }

    await prisma.$transaction([
      prisma.payment.update({ where: { id: paymentId }, data: { status: 'CANCELLED' } }),
      prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PENDING' } }),
    ]);

    res.json({ success: true, message: 'Payment cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Cancel failed' });
  }
});

// Available payment methods
router.get('/methods', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      methods: [
        {
          id: 'paystack_card',
          name: 'Card Payment',
          description: 'Pay with Visa or Mastercard',
          icon: 'credit-card',
          paymentMethod: 'card',
          provider: 'paystack',
        },
        {
          id: 'paystack_momo',
          name: 'Mobile Money',
          description: 'MTN MoMo, Telecel Cash, AirtelTigo Money',
          icon: 'smartphone',
          paymentMethod: 'mobile_money',
          provider: 'paystack',
          subOptions: [
            { id: 'mtn', name: 'MTN Mobile Money' },
            { id: 'telecel', name: 'Telecel Cash' },
            { id: 'airteltigo', name: 'AirtelTigo Money' },
          ],
        },
        {
          id: 'momo_mtn_direct',
          name: 'MTN MoMo (Direct)',
          description: 'Direct MTN Mobile Money prompt',
          icon: 'phone',
          paymentMethod: 'momo_direct',
          provider: 'mtn_momo',
        },
      ],
      defaultMethod: 'paystack_card',
      currency: 'GHS',
    },
  });
});

// ==================== REFUNDS ====================

const refundSchema = z.object({
  reason: z.string().min(5, 'Refund reason must be at least 5 characters'),
  amountInPesewas: z.number().int().positive().optional(), // Optional: partial refund amount
});

/**
 * POST /api/payments/refund/:orderId
 * Initiate a refund (admin only)
 */
router.post('/refund/:orderId', authMiddleware, validate(refundSchema), async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const user = (req as any).user;

    // Only admin can issue refunds
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        sellerOrders: {
          include: {
            seller: { include: { wallet: true } },
          },
        },
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!order.payment || order.payment.status !== 'SUCCESS') {
      return res.status(400).json({ success: false, message: 'No successful payment to refund' });
    }

    const { reason, amountInPesewas } = req.body;
    const refundAmount = amountInPesewas || order.payment.amountInPesewas; // Full refund by default

    // Check for existing refunds to prevent over-refunding
    const existingRefunds = await prisma.refund.aggregate({
      where: { paymentId: order.payment.id, status: { in: ['PENDING', 'SUCCESS'] } },
      _sum: { amountInPesewas: true },
    });
    const totalRefunded = existingRefunds._sum.amountInPesewas || 0;
    const maxRefundable = order.payment.amountInPesewas - totalRefunded;

    if (refundAmount > maxRefundable) {
      return res.status(400).json({
        success: false,
        message: `Maximum refundable amount is ₵${(maxRefundable / 100).toFixed(2)}`,
      });
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        paymentId: order.payment.id,
        amountInPesewas: refundAmount,
        reason,
        status: 'PENDING',
      },
    });

    // Call Paystack refund if gateway reference exists
    let gatewaySuccess = false;
    if (order.payment.gatewayReference && order.payment.gatewayProvider === 'paystack') {
      gatewaySuccess = await paystackService.createRefund(
        order.payment.gatewayReference,
        refundAmount,
      );
    } else {
      // For dev/sandbox or non-Paystack, auto-succeed
      gatewaySuccess = true;
    }

    if (gatewaySuccess) {
      await prisma.$transaction(async (tx) => {
        // Mark refund as successful
        await tx.refund.update({
          where: { id: refund.id },
          data: {
            status: 'SUCCESS',
            processedAt: new Date(),
            gatewayReference: order.payment?.gatewayReference || null,
          },
        });

        // If full refund, cancel the order
        if (refundAmount >= order.payment!.amountInPesewas) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'REFUNDED' },
          });
          await tx.sellerOrder.updateMany({
            where: { orderId },
            data: { status: 'REFUNDED' },
          });
        }

        // Debit seller wallets proportionally
        for (const sellerOrder of order.sellerOrders) {
          if (!sellerOrder.seller?.wallet) continue;

          const sellerRefundPortion = Math.round(
            (refundAmount * sellerOrder.payoutAmountInPesewas) / order.totalInPesewas,
          );

          if (sellerRefundPortion > 0) {
            const wallet = sellerOrder.seller.wallet;
            await tx.sellerWallet.update({
              where: { id: wallet.id },
              data: {
                pendingBalance: { decrement: Math.min(sellerRefundPortion, wallet.pendingBalance) },
                totalEarned: { decrement: sellerRefundPortion },
              },
            });

            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                type: 'REFUND',
                amount: -sellerRefundPortion,
                balanceBefore: wallet.pendingBalance,
                balanceAfter: wallet.pendingBalance - sellerRefundPortion,
                description: `Refund for order #${order.orderNumber}: ${reason}`,
                referenceId: refund.id,
              },
            });
          }
        }

        // Restore inventory for full refunds
        if (refundAmount >= order.payment!.amountInPesewas) {
          for (const item of order.items) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product?.trackInventory) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stockQuantity: { increment: item.quantity } },
              });
              await tx.inventoryLog.create({
                data: {
                  productId: item.productId,
                  action: 'RETURN',
                  quantityChange: item.quantity,
                  previousQuantity: product.stockQuantity,
                  newQuantity: product.stockQuantity + item.quantity,
                  orderId,
                  userId: user.id,
                  notes: `Refund: ${reason}`,
                },
              });
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refundId: refund.id,
          amountInCedis: refundAmount / 100,
          status: 'SUCCESS',
        },
      });
    } else {
      // Gateway refund failed
      await prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'FAILED' },
      });

      res.status(500).json({
        success: false,
        message: 'Refund processing failed at payment gateway. Please try again.',
      });
    }
  } catch (error: any) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, message: error.message || 'Refund failed' });
  }
});

/**
 * GET /api/payments/refunds/:orderId
 * Get refunds for a specific order
 */
router.get('/refunds/:orderId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const user = (req as any).user;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...(user.role !== 'ADMIN' ? { userId: user.id } : {}),
      },
      include: { payment: true },
    });

    if (!order || !order.payment) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const refunds = await prisma.refund.findMany({
      where: { paymentId: order.payment.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        refunds: refunds.map((r) => ({
          id: r.id,
          amountInCedis: r.amountInPesewas / 100,
          reason: r.reason,
          status: r.status,
          processedAt: r.processedAt,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get refunds' });
  }
});

/**
 * GET /api/payments/refunds
 * Admin: list all refunds (paginated)
 */
router.get('/refunds', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.refund.count(),
    ]);

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get refunds' });
  }
});

export default router;
