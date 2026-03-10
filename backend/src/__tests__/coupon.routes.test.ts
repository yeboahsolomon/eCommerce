/**
 * Coupon CRUD API Tests
 * Tests: list, create, update, deactivate, validation, admin-only access
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  mockPrisma,
  testUser,
  testAdmin,
  getAuthCookie,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

import couponRoutes from '../routes/coupon.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/admin/coupons', couponRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const testCoupon = {
  id: 'cltest0000000000coupon01',
  code: 'SAVE20',
  discountType: 'percentage',
  discountValue: 20,
  minOrderInPesewas: 5000,
  maxDiscountInPesewas: 200000,
  usageLimit: 100,
  usageCount: 5,
  startsAt: new Date('2026-01-01'),
  expiresAt: new Date('2027-01-01'),
  isActive: true,
  sellerId: null,
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
};

// ==================== TESTS ====================

describe('Coupon Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();
    mockPrisma.user.findUnique.mockResolvedValue(testAdmin);
  });

  // ===== LIST COUPONS =====

  describe('GET /api/admin/coupons', () => {
    it('should return paginated coupons list', async () => {
      mockPrisma.coupon.findMany.mockResolvedValue([testCoupon]);
      mockPrisma.coupon.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/admin/coupons')
        .set('Cookie', getAuthCookie(testAdmin));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.coupons).toHaveLength(1);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('should filter by search query', async () => {
      mockPrisma.coupon.findMany.mockResolvedValue([testCoupon]);
      mockPrisma.coupon.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/admin/coupons?search=SAVE')
        .set('Cookie', getAuthCookie(testAdmin));

      expect(res.status).toBe(200);
      expect(mockPrisma.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            code: { contains: 'SAVE', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should filter active coupons', async () => {
      mockPrisma.coupon.findMany.mockResolvedValue([testCoupon]);
      mockPrisma.coupon.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/admin/coupons?status=active')
        .set('Cookie', getAuthCookie(testAdmin));

      expect(res.status).toBe(200);
      expect(mockPrisma.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should deny access to non-admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUser);

      const res = await request(app)
        .get('/api/admin/coupons')
        .set('Cookie', getAuthCookie(testUser));

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/admin/coupons');
      expect(res.status).toBe(401);
    });
  });

  // ===== CREATE COUPON =====

  describe('POST /api/admin/coupons', () => {
    it('should create a coupon with valid data', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null); // no duplicate
      mockPrisma.coupon.create.mockResolvedValue(testCoupon);

      const res = await request(app)
        .post('/api/admin/coupons')
        .set('Cookie', getAuthCookie(testAdmin))
        .send({
          code: 'SAVE20',
          discountType: 'percentage',
          discountValue: 20,
          minOrderInPesewas: 5000,
          maxDiscountInPesewas: 200000,
          usageLimit: 100,
          expiresAt: '2027-01-01T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.coupon).toBeDefined();
      expect(res.body.data.coupon.code).toBe('SAVE20');
    });

    it('should reject duplicate coupon codes', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(testCoupon); // duplicate found

      const res = await request(app)
        .post('/api/admin/coupons')
        .set('Cookie', getAuthCookie(testAdmin))
        .send({
          code: 'SAVE20',
          discountType: 'percentage',
          discountValue: 20,
        });

      expect(res.status).toBe(409);
    });

    it('should return validation error for missing fields', async () => {
      const res = await request(app)
        .post('/api/admin/coupons')
        .set('Cookie', getAuthCookie(testAdmin))
        .send({ code: 'X' }); // too short + missing required fields

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should uppercase and trim the coupon code', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      mockPrisma.coupon.create.mockResolvedValue({
        ...testCoupon,
        code: 'SUMMER',
      });

      const res = await request(app)
        .post('/api/admin/coupons')
        .set('Cookie', getAuthCookie(testAdmin))
        .send({
          code: '  summer  ',
          discountType: 'fixed',
          discountValue: 500,
        });

      expect(res.status).toBe(201);
      // The schema transform uppercases & trims
      expect(mockPrisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'SUMMER',
          }),
        })
      );
    });
  });

  // ===== UPDATE COUPON =====

  describe('PUT /api/admin/coupons/:id', () => {
    it('should update an existing coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(testCoupon);
      mockPrisma.coupon.update.mockResolvedValue({
        ...testCoupon,
        discountValue: 30,
      });

      const res = await request(app)
        .put(`/api/admin/coupons/${testCoupon.id}`)
        .set('Cookie', getAuthCookie(testAdmin))
        .send({ discountValue: 30 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('updated');
    });

    it('should return 404 for non-existent coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/admin/coupons/nonexistent')
        .set('Cookie', getAuthCookie(testAdmin))
        .send({ discountValue: 30 });

      expect(res.status).toBe(404);
    });

    it('should prevent changing to a duplicate code', async () => {
      // First call returns the existing coupon for the ID check
      mockPrisma.coupon.findUnique
        .mockResolvedValueOnce(testCoupon) // found by ID
        .mockResolvedValueOnce({ ...testCoupon, id: 'other-id', code: 'NEWCODE' }); // duplicate found

      const res = await request(app)
        .put(`/api/admin/coupons/${testCoupon.id}`)
        .set('Cookie', getAuthCookie(testAdmin))
        .send({ code: 'NEWCODE' });

      expect(res.status).toBe(409);
    });
  });

  // ===== DEACTIVATE COUPON =====

  describe('DELETE /api/admin/coupons/:id', () => {
    it('should deactivate (soft delete) a coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(testCoupon);
      mockPrisma.coupon.update.mockResolvedValue({
        ...testCoupon,
        isActive: false,
      });

      const res = await request(app)
        .delete(`/api/admin/coupons/${testCoupon.id}`)
        .set('Cookie', getAuthCookie(testAdmin));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deactivated');
      expect(mockPrisma.coupon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testCoupon.id },
          data: { isActive: false },
        })
      );
    });

    it('should return 404 for non-existent coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/admin/coupons/nonexistent')
        .set('Cookie', getAuthCookie(testAdmin));

      expect(res.status).toBe(404);
    });
  });
});
