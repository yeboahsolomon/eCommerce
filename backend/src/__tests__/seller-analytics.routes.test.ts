/**
 * Seller Analytics Routes – Unit Tests
 * Tests: sales, orders, revenue, best-sellers endpoints + auth guards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  mockPrisma,
  testUser,
  testSeller,
  getAuthCookie,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

import sellerAnalyticsRoutes from '../routes/seller-analytics.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/seller/analytics', sellerAnalyticsRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ==================== FIXTURES ====================

const sellerProfileFixture = {
  id: testSeller.sellerProfile.id,
  userId: testSeller.id,
  isActive: true,
};

// ==================== TESTS ====================

describe('Seller Analytics Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();

    // Default: seller user lookup succeeds for auth middleware
    mockPrisma.user.findUnique.mockResolvedValue(testSeller);

    // Default: seller profile exists
    mockPrisma.sellerProfile.findUnique.mockResolvedValue(sellerProfileFixture);
  });

  // ==================== AUTH GUARDS ====================

  describe('Authentication & Authorization', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/seller/analytics/sales');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-seller users (BUYER role)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUser); // BUYER role

      const res = await request(app)
        .get('/api/seller/analytics/sales')
        .set('Cookie', getAuthCookie(testUser));

      expect(res.status).toBe(403);
    });

    it('should succeed for SELLER role users', async () => {
      mockPrisma.sellerOrder.aggregate.mockResolvedValue({
        _sum: { totalInPesewas: 0 },
      });
      mockPrisma.sellerOrder.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/seller/analytics/sales')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
    });
  });

  // ==================== SALES ENDPOINT ====================

  describe('GET /api/seller/analytics/sales', () => {
    it('should return total sales in GHS', async () => {
      mockPrisma.sellerOrder.aggregate.mockResolvedValue({
        _sum: { totalInPesewas: 1245050 }, // ₵12,450.50
      });
      mockPrisma.sellerOrder.count.mockResolvedValue(87);

      const res = await request(app)
        .get('/api/seller/analytics/sales')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currency).toBe('GHS');
      expect(res.body.data.totalSales).toBe(12450.50);
      expect(res.body.data.totalOrders).toBe(87);
      expect(res.body.data.averageOrderValue).toBeCloseTo(143.11, 0);
      expect(res.body.data.period).toBeDefined();
    });

    it('should return zero values when no orders exist', async () => {
      mockPrisma.sellerOrder.aggregate.mockResolvedValue({
        _sum: { totalInPesewas: null },
      });
      mockPrisma.sellerOrder.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/seller/analytics/sales')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.totalSales).toBe(0);
      expect(res.body.data.totalOrders).toBe(0);
      expect(res.body.data.averageOrderValue).toBe(0);
    });

    it('should respect date range query parameters', async () => {
      mockPrisma.sellerOrder.aggregate.mockResolvedValue({
        _sum: { totalInPesewas: 500000 },
      });
      mockPrisma.sellerOrder.count.mockResolvedValue(5);

      const res = await request(app)
        .get('/api/seller/analytics/sales?start_date=2026-01-01&end_date=2026-01-31')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.totalSales).toBe(5000);

      // Verify Prisma was called with date filters
      expect(mockPrisma.sellerOrder.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should return 404 if seller profile not found', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/seller/analytics/sales')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(404);
    });
  });

  // ==================== ORDERS ENDPOINT ====================

  describe('GET /api/seller/analytics/orders', () => {
    it('should return order count with status breakdown', async () => {
      // Mock counts: total=87, then individual statuses
      mockPrisma.sellerOrder.count
        .mockResolvedValueOnce(87)  // total
        .mockResolvedValueOnce(5)   // pending
        .mockResolvedValueOnce(12)  // processing
        .mockResolvedValueOnce(20)  // shipped
        .mockResolvedValueOnce(45)  // delivered
        .mockResolvedValueOnce(3)   // cancelled
        .mockResolvedValueOnce(2);  // refunded

      const res = await request(app)
        .get('/api/seller/analytics/orders')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalOrders).toBe(87);
      expect(res.body.data.statusBreakdown).toEqual({
        pending: 5,
        processing: 12,
        shipped: 20,
        delivered: 45,
        cancelled: 3,
        refunded: 2,
      });
    });

    it('should return all zeros when no orders exist', async () => {
      mockPrisma.sellerOrder.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/seller/analytics/orders')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.totalOrders).toBe(0);
      expect(res.body.data.statusBreakdown.pending).toBe(0);
    });
  });

  // ==================== REVENUE ENDPOINT ====================

  describe('GET /api/seller/analytics/revenue', () => {
    it('should return revenue with period comparison (increase)', async () => {
      mockPrisma.sellerOrder.aggregate
        .mockResolvedValueOnce({ _sum: { payoutAmountInPesewas: 1150075 } })  // current: ₵11,500.75
        .mockResolvedValueOnce({ _sum: { payoutAmountInPesewas: 980000 } });  // previous: ₵9,800.00

      const res = await request(app)
        .get('/api/seller/analytics/revenue')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.currency).toBe('GHS');
      expect(res.body.data.totalRevenue).toBe(11500.75);
      expect(res.body.data.previousPeriodRevenue).toBe(9800);
      expect(res.body.data.percentageChange).toBeGreaterThan(0);
      expect(res.body.data.trend).toBe('up');
      expect(res.body.data.period).toBeDefined();
      expect(res.body.data.previousPeriod).toBeDefined();
    });

    it('should show downward trend when revenue decreases', async () => {
      mockPrisma.sellerOrder.aggregate
        .mockResolvedValueOnce({ _sum: { payoutAmountInPesewas: 500000 } })   // current: ₵5,000
        .mockResolvedValueOnce({ _sum: { payoutAmountInPesewas: 1000000 } }); // previous: ₵10,000

      const res = await request(app)
        .get('/api/seller/analytics/revenue')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.trend).toBe('down');
      expect(res.body.data.percentageChange).toBe(-50);
    });

    it('should handle zero previous period (new seller)', async () => {
      mockPrisma.sellerOrder.aggregate
        .mockResolvedValueOnce({ _sum: { payoutAmountInPesewas: 500000 } })
        .mockResolvedValueOnce({ _sum: { payoutAmountInPesewas: null } });

      const res = await request(app)
        .get('/api/seller/analytics/revenue')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.percentageChange).toBe(100);
      expect(res.body.data.trend).toBe('up');
    });

    it('should show stable trend when both periods have zero revenue', async () => {
      mockPrisma.sellerOrder.aggregate
        .mockResolvedValueOnce({ _sum: { payoutAmountInPesewas: null } })
        .mockResolvedValueOnce({ _sum: { payoutAmountInPesewas: null } });

      const res = await request(app)
        .get('/api/seller/analytics/revenue')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.trend).toBe('stable');
      expect(res.body.data.percentageChange).toBe(0);
    });
  });

  // ==================== BEST SELLERS ENDPOINT ====================

  describe('GET /api/seller/analytics/best-sellers', () => {
    it('should return top products sorted by units sold', async () => {
      mockPrisma.orderItem.groupBy
        // Current period
        .mockResolvedValueOnce([
          { productId: 'prod1', _sum: { quantity: 42, totalPriceInPesewas: 6300000 } },
          { productId: 'prod2', _sum: { quantity: 28, totalPriceInPesewas: 2800000 } },
        ])
        // Previous period
        .mockResolvedValueOnce([
          { productId: 'prod1', _sum: { quantity: 30 } },
          { productId: 'prod2', _sum: { quantity: 35 } },
        ]);

      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod1', name: 'iPhone 15 Pro', images: [{ url: '/uploads/iphone.jpg' }] },
        { id: 'prod2', name: 'Samsung Galaxy S24', images: [{ url: '/uploads/samsung.jpg' }] },
      ]);

      const res = await request(app)
        .get('/api/seller/analytics/best-sellers')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.currency).toBe('GHS');
      expect(res.body.data.bestSellers).toHaveLength(2);

      const first = res.body.data.bestSellers[0];
      expect(first.productName).toBe('iPhone 15 Pro');
      expect(first.unitsSold).toBe(42);
      expect(first.revenue).toBe(63000); // 6300000 / 100
      expect(first.trend).toBe('up');    // 42 > 30

      const second = res.body.data.bestSellers[1];
      expect(second.productName).toBe('Samsung Galaxy S24');
      expect(second.trend).toBe('down'); // 28 < 35
    });

    it('should return empty array when no sales exist', async () => {
      mockPrisma.orderItem.groupBy.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/seller/analytics/best-sellers')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.bestSellers).toEqual([]);
    });

    it('should respect the limit query parameter', async () => {
      mockPrisma.orderItem.groupBy
        .mockResolvedValueOnce([
          { productId: 'prod1', _sum: { quantity: 10, totalPriceInPesewas: 100000 } },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod1', name: 'Test Product', images: [] },
      ]);

      const res = await request(app)
        .get('/api/seller/analytics/best-sellers?limit=1')
        .set('Cookie', getAuthCookie(testSeller));

      expect(res.status).toBe(200);
      expect(res.body.data.bestSellers).toHaveLength(1);

      // Verify groupBy was called with take: 1
      expect(mockPrisma.orderItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 })
      );
    });
  });
});
