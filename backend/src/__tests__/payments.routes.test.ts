/**
 * Payment & Webhook Tests
 * Tests: Paystack webhook, MoMo init, payment verification, cancellation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import crypto from 'crypto';
import {
  mockPrisma,
  mockMomoService,
  mockPaystackService,
  testUser,
  testOrder,
  testPayment,
  getAuthCookie,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

vi.mock('../services/momo.service.js', () => ({
  momoService: mockMomoService,
}));

vi.mock('../services/paystack.service.js', () => ({
  paystackService: mockPaystackService,
}));

import paymentRoutes from '../routes/payments.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/payments', paymentRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ==================== TESTS ====================

describe('Payment Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();

    // Default: user lookup succeeds for auth middleware
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  // ===== PAYSTACK WEBHOOK =====

  describe('POST /api/payments/paystack/webhook', () => {
    const webhookPayload = {
      event: 'charge.success',
      data: {
        reference: 'GHM-TEST-REF123',
        status: 'success',
        amount: 3000000,
        metadata: { orderId: testOrder.id, userId: testUser.id },
      },
    };

    it('should update payment and order on valid charge.success webhook', async () => {
      mockPaystackService.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        ...testPayment,
        status: 'PROCESSING',
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const res = await request(app)
        .post('/api/payments/paystack/webhook')
        .set('x-paystack-signature', 'valid-signature')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      // Verify signature was checked
      expect(mockPaystackService.verifyWebhookSignature).toHaveBeenCalled();

      // Verify transactional update was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should return 401 for invalid webhook signature', async () => {
      mockPaystackService.verifyWebhookSignature.mockReturnValue(false);

      const res = await request(app)
        .post('/api/payments/paystack/webhook')
        .set('x-paystack-signature', 'bad-signature')
        .send(webhookPayload);

      expect(res.status).toBe(401);
    });

    it('should be idempotent — skip already-confirmed payments', async () => {
      mockPaystackService.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        ...testPayment,
        status: 'SUCCESS', // Already confirmed
      });

      const res = await request(app)
        .post('/api/payments/paystack/webhook')
        .set('x-paystack-signature', 'valid-signature')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      // $transaction should NOT be called for already-confirmed payment
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ===== MOMO INITIALIZE =====

  describe('POST /api/payments/momo/initialize', () => {
    const momoPayload = {
      orderId: testOrder.id,
      phoneNumber: '0241234567',
    };

    it('should initialize MoMo payment for a valid order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        ...testOrder,
        status: 'PENDING',
        payment: null,
      });
      mockMomoService.requestToPay.mockResolvedValue({
        referenceId: 'momo-ref-001',
        status: 'PENDING',
      });
      mockPrisma.payment.upsert.mockResolvedValue({
        id: 'pay1',
        gatewayReference: 'momo-ref-001',
      });
      mockPrisma.order.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/payments/momo/initialize')
        .set('Cookie', getAuthCookie(testUser))
        .send(momoPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reference).toBe('momo-ref-001');
      expect(res.body.data.provider).toBe('mtn_momo');
    });

    it('should return 404 for non-existent or already-paid order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/payments/momo/initialize')
        .set('Cookie', getAuthCookie(testUser))
        .send(momoPayload);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should return 400 if payment already in progress', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        ...testOrder,
        payment: { status: 'PROCESSING' },
      });

      const res = await request(app)
        .post('/api/payments/momo/initialize')
        .set('Cookie', getAuthCookie(testUser))
        .send(momoPayload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already in progress');
    });
  });

  // ===== PAYMENT METHODS =====

  describe('GET /api/payments/methods', () => {
    it('should return available payment methods', async () => {
      const res = await request(app).get('/api/payments/methods');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.methods).toBeInstanceOf(Array);
      expect(res.body.data.methods.length).toBeGreaterThan(0);
      expect(res.body.data.currency).toBe('GHS');
    });
  });

  // ===== CANCEL PAYMENT =====

  describe('POST /api/payments/:paymentId/cancel', () => {
    it('should cancel a pending payment and reset order', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        ...testPayment,
        status: 'PENDING',
        gatewayProvider: 'mtn_momo',
        gatewayReference: 'momo-ref-cancel',
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const res = await request(app)
        .post(`/api/payments/${testPayment.id}/cancel`)
        .set('Cookie', getAuthCookie(testUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('cancelled');

      // MoMo cancellation was called
      expect(mockMomoService.cancelPayment).toHaveBeenCalledWith('momo-ref-cancel');
    });

    it('should return 404 for non-cancellable payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/payments/${testPayment.id}/cancel`)
        .set('Cookie', getAuthCookie(testUser));

      expect(res.status).toBe(404);
    });
  });
});
