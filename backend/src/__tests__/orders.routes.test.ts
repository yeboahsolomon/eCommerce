/**
 * Order Transaction Tests
 * Tests: ACID order creation, stock decrement, coupon, pagination
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  mockPrisma,
  testUser,
  testCart,
  testOrder,
  getAuthCookie,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

import orderRoutes from '../routes/orders.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/orders', orderRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const validOrderPayload = {
  shippingFullName: 'Kwame Asante',
  shippingPhone: '0241234567',
  shippingRegion: 'Greater Accra',
  shippingCity: 'Accra',
  shippingArea: 'Osu',
  shippingStreetAddress: '10 Oxford Street, near Osu Castle',
  shippingGpsAddress: 'GA-183-8164',
  customerEmail: 'buyer@test.com',
  customerPhone: '0241234567',
  paymentMethod: 'CASH_ON_DELIVERY',
  deliveryMethod: 'standard',
};

// ==================== TESTS ====================

describe('Order Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();

    // Default: user lookup succeeds for auth middleware
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  // ===== CREATE ORDER =====

  describe('POST /api/orders', () => {
    it('should create an order from cart with snapshot data', async () => {
      // Cart with items
      mockPrisma.cart.findUnique.mockResolvedValue(testCart);

      // No coupon
      const createdOrder = {
        ...testOrder,
        status: 'CONFIRMED', // CASH_ON_DELIVERY → auto-confirm
        items: [
          {
            id: 'oi1',
            productName: 'iPhone 15 Pro',
            productSku: 'IP15P-001',
            productImage: '/uploads/iphone.jpg',
            quantity: 2,
            unitPriceInPesewas: 1500000,
            totalPriceInPesewas: 3000000,
          },
        ],
        payment: { id: 'p1', status: 'PENDING', method: 'CASH_ON_DELIVERY' },
      };

      // $transaction receives a callback; we execute it with a mock tx
      mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
        // The callback receives a transaction client (use mockPrisma as the tx)
        return callback(mockPrisma);
      });

      // Inside the transaction:
      mockPrisma.order.create.mockResolvedValue(createdOrder);
      mockPrisma.product.update.mockResolvedValue({ stockQuantity: 8 });
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.inventoryLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', getAuthCookie(testUser))
        .send(validOrderPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toBeDefined();

      // Verify cart was looked up
      expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: testUser.id },
        })
      );
    });

    it('should return 400 if cart is empty', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        ...testCart,
        items: [],
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', getAuthCookie(testUser))
        .send(validOrderPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if cart does not exist', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', getAuthCookie(testUser))
        .send(validOrderPayload);

      expect(res.status).toBe(400);
    });

    it('should apply a valid coupon discount', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(testCart);
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon1',
        code: 'SAVE10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderInPesewas: null,
        maxDiscountInPesewas: 500000,
        usageLimit: 100,
        usageCount: 5,
        isActive: true,
        startsAt: new Date('2026-01-01'),
        expiresAt: new Date('2027-01-01'),
      });

      mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
        return callback(mockPrisma);
      });

      const createdOrder = {
        ...testOrder,
        discountInPesewas: 300000, // 10% of 3000000
        totalInPesewas: 2700000,
        status: 'CONFIRMED',
        items: [],
        payment: { id: 'p1', status: 'PENDING', method: 'CASH_ON_DELIVERY' },
      };

      mockPrisma.order.create.mockResolvedValue(createdOrder);
      mockPrisma.product.update.mockResolvedValue({});
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.coupon.update.mockResolvedValue({});
      mockPrisma.inventoryLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', getAuthCookie(testUser))
        .send({ ...validOrderPayload, couponCode: 'SAVE10' });

      expect(res.status).toBe(201);
      // Coupon was looked up
      expect(mockPrisma.coupon.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'SAVE10' },
        })
      );
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send(validOrderPayload);

      expect(res.status).toBe(401);
    });
  });

  // ===== GET ORDERS =====

  describe('GET /api/orders', () => {
    it('should return paginated order history', async () => {
      mockPrisma.order.findMany.mockResolvedValue([testOrder]);
      mockPrisma.order.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/orders')
        .set('Cookie', getAuthCookie(testUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.total).toBe(1);
    });
  });

  // ===== GET ORDER BY ID =====

  describe('GET /api/orders/:id', () => {
    it('should return a single order with items', async () => {
      const orderWithItems = {
        ...testOrder,
        items: [
          {
            id: 'oi1',
            productName: 'iPhone 15 Pro',
            unitPriceInPesewas: 1500000,
            totalPriceInPesewas: 3000000,
            quantity: 2,
          },
        ],
        payment: { status: 'SUCCESS', method: 'CARD' },
      };

      mockPrisma.order.findFirst.mockResolvedValue(orderWithItems);

      const res = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Cookie', getAuthCookie(testUser));

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderNumber).toBe(testOrder.orderNumber);
    });

    it('should return 404 for non-existent order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/orders/clnonexistent000000001')
        .set('Cookie', getAuthCookie(testUser));

      expect(res.status).toBe(404);
    });
  });
});
