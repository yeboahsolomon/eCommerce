
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { emailService } from '../services/email.service.js';

const router = Router();

/**
 * POST /api/webhooks/paystack
 * Handles Paystack webhook events:
 *   • charge.success → confirm payment, credit seller wallets, email buyer
 *   • charge.failed  → mark payment failed
 *   • transfer.success / transfer.failed → update payout status
 *
 * IMPORTANT: Always respond 200 to prevent Paystack retry storms.
 * All errors are logged internally but never surfaced in the HTTP response.
 */
router.post('/paystack', async (req: Request, res: Response) => {
  // Always acknowledge immediately — failures are internal concerns
  res.sendStatus(200);

  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    // ── Signature verification ──
    if (secretKey) {
      const hash = crypto
        .createHmac('sha512', secretKey)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== signature) {
        console.warn('⚠️ Webhook signature mismatch — request ignored');
        return;
      }
    } else {
      // Dev mode: accept all webhooks but log warning
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set — accepting webhook without verification');
    }

    const { event, data } = req.body;
    console.log(`📬 Paystack webhook: ${event}`);

    // ── charge.success ──
    if (event === 'charge.success') {
      await handleChargeSuccess(data);
    }

    // ── charge.failed ──
    if (event === 'charge.failed') {
      await handleChargeFailed(data);
    }

    // ── transfer.success (payout complete) ──
    if (event === 'transfer.success') {
      await handleTransferSuccess(data);
    }

    // ── transfer.failed ──
    if (event === 'transfer.failed') {
      await handleTransferFailed(data);
    }
  } catch (error) {
    // Log but never fail — 200 was already sent
    console.error('❌ Webhook processing error:', error);
  }
});

// ━━━━━━━━━━━━━━━━━━━━ Event Handlers ━━━━━━━━━━━━━━━━━━━━

/**
 * Payment succeeded → confirm order → credit seller wallets → send emails
 */
async function handleChargeSuccess(data: any): Promise<void> {
  const { reference, metadata, amount, channel } = data;
  const orderId = metadata?.orderId;

  if (!orderId) {
    console.warn('Webhook charge.success missing orderId in metadata');
    return;
  }

  // Fetch order with seller orders
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { firstName: true, email: true } },
      payment: true,
      sellerOrders: {
        include: {
          seller: {
            include: {
              wallet: true,
              user: { select: { email: true } },
            },
          },
          items: true,
        },
      },
    },
  });

  if (!order) {
    console.warn(`Webhook: Order ${orderId} not found`);
    return;
  }

  // Idempotency: skip if already processed
  if (order.payment?.status === 'SUCCESS') {
    console.log(`Webhook: Payment for order ${order.orderNumber} already processed — skipping`);
    return;
  }

  // ── 1. Update payment + order status (ACID) ──
  await prisma.$transaction(async (tx) => {
    // Mark payment successful
    await tx.payment.updateMany({
      where: { orderId },
      data: {
        status: 'SUCCESS',
        gatewayReference: reference,
        gatewayResponse: JSON.stringify({ channel, amount }),
        confirmedAt: new Date(),
        cardLast4: data.authorization?.last4 || null,
        cardBrand: data.authorization?.card_type || null,
      },
    });

    // Advance order to PROCESSING
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'PROCESSING',
        confirmedAt: new Date(),
      },
    });

    // Update seller order statuses
    await tx.sellerOrder.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    // ── 2. Credit each seller's wallet ──
    for (const sellerOrder of order.sellerOrders) {
      if (!sellerOrder.seller) continue;

      // Get or create wallet
      let wallet = sellerOrder.seller.wallet;
      if (!wallet) {
        wallet = await tx.sellerWallet.create({
          data: {
            sellerId: sellerOrder.sellerId,
            currentBalance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
          },
        });
      }

      const payoutAmount = sellerOrder.payoutAmountInPesewas;

      // Credit pending balance (becomes available after delivery confirmation)
      await tx.sellerWallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { increment: payoutAmount },
          totalEarned: { increment: payoutAmount },
        },
      });

      // Create SALE transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'SALE',
          amount: payoutAmount,
          balanceBefore: wallet.pendingBalance,
          balanceAfter: wallet.pendingBalance + payoutAmount,
          description: `Sale from order #${order.orderNumber}`,
          referenceId: order.id,
        },
      });

      // Create COMMISSION transaction record
      const commissionAmount = sellerOrder.platformFeeInPesewas;
      if (commissionAmount > 0) {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'COMMISSION',
            amount: -commissionAmount,
            balanceBefore: wallet.pendingBalance + payoutAmount,
            balanceAfter: wallet.pendingBalance + payoutAmount - commissionAmount,
            description: `Platform fee for order #${order.orderNumber}`,
            referenceId: order.id,
          },
        });
      }
    }
  });

  // ── 3. Send emails (non-blocking) ──
  const customerName = order.user?.firstName || order.shippingFullName;
  const customerEmail = order.user?.email || order.customerEmail;

  // Payment confirmation to buyer
  emailService
    .sendPaymentConfirmationEmail(
      customerEmail,
      customerName,
      order.orderNumber,
      `₵${(order.totalInPesewas / 100).toFixed(2)}`,
      order.payment?.method || 'N/A',
    )
    .catch((e) => console.error('Payment email failed:', e));

  // New order notification to each seller
  for (const sellerOrder of order.sellerOrders) {
    const sellerEmail = sellerOrder.seller?.user?.email;
    if (!sellerEmail) continue;

    emailService
      .sendNewOrderSellerEmail({
        to: sellerEmail,
        sellerName: sellerOrder.seller?.businessName || 'Seller',
        orderNumber: order.orderNumber,
        customerName,
        customerRegion: order.shippingRegion || '',
        orderTotal: `₵${(sellerOrder.totalInPesewas / 100).toFixed(2)}`,
        payoutAmount: `₵${(sellerOrder.payoutAmountInPesewas / 100).toFixed(2)}`,
        items: sellerOrder.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          sku: item.productSku || undefined,
        })),
        deliveryName: order.shippingFullName,
        deliveryAddress: order.shippingStreetAddress || '',
        deliveryCity: order.shippingCity || '',
        deliveryRegion: order.shippingRegion || '',
        deliveryPhone: order.shippingPhone || '',
      })
      .catch((e) => console.error(`Seller email to ${sellerEmail} failed:`, e));
  }

  console.log(`✅ Payment processed for order ${order.orderNumber}`);
}

/**
 * Payment failed
 */
async function handleChargeFailed(data: any): Promise<void> {
  const orderId = data.metadata?.orderId;
  if (!orderId) return;

  await prisma.payment
    .updateMany({
      where: { orderId },
      data: {
        status: 'FAILED',
        failureReason: data.gateway_response || 'Payment declined',
        failedAt: new Date(),
      },
    })
    .catch((e) => console.error('Failed to update payment status:', e));

  await prisma.order
    .update({
      where: { id: orderId },
      data: { status: 'FAILED' },
    })
    .catch((e) => console.error('Failed to update order status:', e));

  console.log(`⚠️ Payment failed for order ${orderId}`);
}

/**
 * Payout (transfer) to seller succeeded
 */
async function handleTransferSuccess(data: any): Promise<void> {
  const { reference, amount } = data;
  if (!reference) return;

  await prisma.payout
    .updateMany({
      where: { transactionReference: reference },
      data: {
        status: 'PAID',
        processedAt: new Date(),
      },
    })
    .catch((e) => console.error('Failed to update payout status:', e));

  console.log(`✅ Payout transfer ${reference} completed (₵${(amount / 100).toFixed(2)})`);
}

/**
 * Payout (transfer) to seller failed
 */
async function handleTransferFailed(data: any): Promise<void> {
  const { reference, reason } = data;
  if (!reference) return;

  await prisma.payout
    .updateMany({
      where: { transactionReference: reference },
      data: {
        status: 'FAILED',
        notes: reason || 'Transfer failed',
      },
    })
    .catch((e) => console.error('Failed to update payout status:', e));

  console.log(`❌ Payout transfer ${reference} failed: ${reason || 'unknown'}`);
}

export default router;
