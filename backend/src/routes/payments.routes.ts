import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { paymentLimiter } from '../middleware/rate-limit.middleware.js';
import { momoService } from '../services/momo.service.js';
import { paystackService } from '../services/paystack.service.js';
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
});

// ==================== MTN MOMO ====================

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

// ==================== PAYSTACK ====================

router.post(
  '/paystack/initialize',
  authMiddleware,
  paymentLimiter,
  validate(paystackPaymentSchema),
  async (req: Request, res: Response) => {
    try {
      const { orderId, email, callbackUrl } = req.body;
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

      const reference = paystackService.generateReference();
      const paystackResponse = await paystackService.initializeTransaction({
        email,
        amount: order.totalInPesewas,
        reference,
        currency: 'GHS',
        callback_url: callbackUrl,
        metadata: { orderId: order.id, userId },
        channels: ['card', 'mobile_money'],
      });

      if (!paystackResponse.status) {
        return res.status(400).json({ success: false, message: paystackResponse.message });
      }

      const payment = await prisma.payment.upsert({
        where: { orderId: order.id },
        update: { status: 'PROCESSING', gatewayProvider: 'paystack', gatewayReference: reference, initiatedAt: new Date() },
        create: { orderId: order.id, amountInPesewas: order.totalInPesewas, method: 'CARD', status: 'PROCESSING', gatewayProvider: 'paystack', gatewayReference: reference },
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
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Payment failed' });
    }
  }
);

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
      await prisma.$transaction([
        prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS', confirmedAt: new Date(), method: paystackResponse.data.channel === 'mobile_money' ? 'MOMO_OTHER' : 'CARD' } }),
        prisma.order.update({ where: { id: payment.order.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } }),
      ]);
      return res.json({ success: true, data: { status: 'SUCCESS', orderNumber: payment.order.orderNumber, channel: paystackResponse.data.channel } });
    } else if (paystackResponse.data.status === 'failed') {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failedAt: new Date(), failureReason: paystackResponse.data.gateway_response } }),
        prisma.order.update({ where: { id: payment.order.id }, data: { status: 'FAILED' } }),
      ]);
      return res.json({ success: false, data: { status: 'FAILED', message: paystackResponse.data.gateway_response } });
    }

    res.json({ success: true, data: { status: paystackResponse.data.status.toUpperCase(), orderNumber: payment.order.orderNumber } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

router.post('/paystack/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    if (!paystackService.verifyWebhookSignature(JSON.stringify(req.body), signature)) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const payment = await prisma.payment.findFirst({ where: { gatewayReference: event.data.reference } });
      if (payment?.status === 'PROCESSING') {
        await prisma.$transaction([
          prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS', confirmedAt: new Date() } }),
          prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CONFIRMED', confirmedAt: new Date() } }),
        ]);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(500).json({ message: 'Webhook error' });
  }
});

router.get('/paystack/config', (req: Request, res: Response) => {
  res.json({ success: true, data: { publicKey: paystackService.getPublicKey(), currency: 'GHS', channels: ['card', 'mobile_money'] } });
});

router.get('/paystack/banks', async (req: Request, res: Response) => {
  const banks = await paystackService.getBanks();
  res.json({ success: true, data: { banks } });
});

// ==================== SHARED ====================

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
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payment' });
  }
});

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

router.get('/methods', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      methods: [
        { id: 'paystack', name: 'Card / Mobile Money', description: 'Visa, Mastercard, or Mobile Money', icon: 'credit-card' },
        { id: 'momo_mtn', name: 'MTN Mobile Money', description: 'Direct MTN MoMo payment', icon: 'phone' },
      ],
      defaultMethod: 'paystack',
      currency: 'GHS',
    },
  });
});

export default router;
