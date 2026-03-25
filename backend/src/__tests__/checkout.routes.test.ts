/**
 * Checkout and Delivery Integration Tests
 * Tests: Delivery fee calculation, cart calculations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  mockPrisma,
  testUser,
  testCart,
  testProduct,
  getAuthCookie,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock Delivery Service
vi.mock('../services/delivery.service.js', () => ({
  deliveryService: {
    calculateFee: vi.fn((sellerRegion: string, sellerCity: string, buyerRegion: string, buyerCity: string) => {
      // Simple mock logic: same region = 20GHS, different = 50GHS
      if (sellerRegion === buyerRegion) return 2000; // 20 GHS in pesewas
      return 5000; // 50 GHS
    }),
    validateGhanaPostGPS: vi.fn((gps: string) => {
      // GA-183-8164 format (2 letters - 3 digits - 4 digits)
      const regex = /^[A-Z]{2}-\d{3}-\d{4}$/;
      return regex.test(gps);
    })
  }
}));

import { deliveryService } from '../services/delivery.service.js';
import checkoutRoutes from '../routes/checkout.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  
  app.use((req, res, next) => {
    if (req.cookies?.accessToken) {
      if (req.cookies.accessToken.includes('buyer')) {
        (req as any).user = testUser;
      }
    }
    next();
  });

  app.use('/api/checkout', checkoutRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ==================== TESTS ====================

describe('Checkout and Delivery Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();
  });

  describe('POST /api/checkout/calculate', () => {
    it('should calculate shipping fees correctly based on location', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(testCart);

      mockPrisma.product.findMany.mockResolvedValue([
        {
          ...testProduct,
          sellerId: 'seller1',
          seller: { id: 'seller1', ghanaRegion: 'Greater Accra', businessAddress: 'Accra' }
        }
      ]);

      const res = await request(app)
        .post('/api/checkout/calculate')
        .set('Cookie', getAuthCookie(testUser))
        .send({ shippingRegion: 'Ashanti', shippingCity: 'Kumasi' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Since buyer is in Ashanti and seller in Greater Accra, the mock returns 5000 (50 GHS)
      expect(res.body.data.shipping).toBe(5000);
      expect(res.body.data.shippingInCedis).toBe(50);
      expect(res.body.data.subtotal).toBe(testProduct.priceInPesewas * 2);
    });

    it('should apply lower shipping fees for same-region deliveries', async () => {
      mockPrisma.cart.findFirst.mockResolvedValue(testCart);

      mockPrisma.product.findMany.mockResolvedValue([
        {
          ...testProduct,
          sellerId: 'seller1',
          seller: { id: 'seller1', ghanaRegion: 'Greater Accra', businessAddress: 'Accra' }
        }
      ]);

      const res = await request(app)
        .post('/api/checkout/calculate')
        .set('Cookie', getAuthCookie(testUser))
        .send({ shippingRegion: 'Greater Accra', shippingCity: 'Tema' });

      expect(res.status).toBe(200);
      // Same region = 2000 (20 GHS) in the mock
      expect(res.body.data.shipping).toBe(2000);
    });
    
    it('should handle empty carts gracefully', async () => {
      mockPrisma.cart.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/checkout/calculate')
        .set('Cookie', getAuthCookie(testUser))
        .send({ shippingRegion: 'Greater Accra', shippingCity: 'Tema' });

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
    });
  });

});
