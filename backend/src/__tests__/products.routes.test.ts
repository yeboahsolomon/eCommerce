/**
 * Product Routes Tests
 * Tests: Product creation by seller, image upload logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  mockPrisma,
  testSeller,
  testAdmin,
  testUser,
  getAuthCookie,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

import productRoutes from '../routes/products.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  // Fake user middleware to simulate authenticated state if cookie is present
  app.use((req, res, next) => {
    // In real app, authMiddleware decodes JWT and sets req.user
    // Here we just look at the cookie for testing
    if (req.cookies?.accessToken) {
      if (req.cookies.accessToken.includes('seller')) (req as any).user = testSeller;
      else if (req.cookies.accessToken.includes('admin')) (req as any).user = testAdmin;
      else if (req.cookies.accessToken.includes('buyer')) (req as any).user = testUser;
    }
    next();
  });
  
  // Real auth middleware uses DB lookup, so we need to mock findUnique
  mockPrisma.user.findUnique.mockImplementation(async (args: any) => {
    if (args.where.id === testSeller.id) return testSeller;
    if (args.where.id === testAdmin.id) return testAdmin;
    if (args.where.id === testUser.id) return testUser;
    return null;
  });

  app.use('/api/products', productRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ==================== TESTS ====================

describe('Product Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();
  });

  describe('POST /api/products', () => {
    const validProductPayload = {
      name: 'Test Product',
      description: 'A great product',
      priceInPesewas: 10000,
      stockQuantity: 50,
      categoryId: 'cattest1',
    };

    it('should allow seller to create a product with their sellerId', async () => {
      // Mock category existence check
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cattest1' });
      
      const createdProduct = {
        id: 'newprod1',
        ...validProductPayload,
        slug: 'test-product',
        sellerId: testSeller.id,
        isActive: false, // Wait for admin approval
      };
      
      mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
        return callback(mockPrisma);
      });
      mockPrisma.product.create.mockResolvedValue(createdProduct);

      const res = await request(app)
        .post('/api/products')
        .set('Cookie', getAuthCookie(testSeller))
        .send(validProductPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sellerId).toBe(testSeller.id);
      
      // Verify create was called with correct seller ID
      const createCall = mockPrisma.product.create.mock.calls[0][0];
      expect(createCall.data.sellerId).toBe(testSeller.id);
    });

    it('should return 403 for non-seller buyers', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Cookie', getAuthCookie(testUser))
        .send(validProductPayload);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/products/:id/images', () => {
    it('should allow seller to update their own product images', async () => {
      // Product belongs to seller
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod1',
        sellerId: testSeller.id,
      });

      mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
        return callback(mockPrisma);
      });

      mockPrisma.productImage.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.productImage.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod1',
        images: [
          { url: '/new/img1.jpg', isPrimary: true },
          { url: '/new/img2.jpg', isPrimary: false }
        ]
      });

      const res = await request(app)
        .put('/api/products/prod1/images')
        .set('Cookie', getAuthCookie(testSeller))
        .send({
          images: [
            { url: '/new/img1.jpg', isPrimary: true, sortOrder: 0 },
            { url: '/new/img2.jpg', isPrimary: false, sortOrder: 1 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.productImage.createMany).toHaveBeenCalled();
    });

    it('should return 403 if seller tries to update another sellers product', async () => {
      // Product belongs to someone else
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod1',
        sellerId: 'some-other-seller-id',
      });

      const res = await request(app)
        .put('/api/products/prod1/images')
        .set('Cookie', getAuthCookie(testSeller))
        .send({ images: [] });

      expect(res.status).toBe(403);
    });
  });
});
