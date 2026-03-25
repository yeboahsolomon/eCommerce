/**
 * Cart Service Tests
 * Tests: Out-of-stock rejection, recalculations, guest cart merge
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  mockPrisma,
  testUser,
  testProduct,
  testCart,
  getAuthCookie,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

import cartRoutes from '../routes/cart.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  
  // Fake user middleware to simulate authenticated state if cookie is present
  app.use((req, res, next) => {
    if (req.cookies?.accessToken) {
      if (req.cookies.accessToken.includes('buyer')) {
        (req as any).user = testUser;
      }
    }
    next();
  });
  
  mockPrisma.user.findUnique.mockImplementation(async (args: any) => {
    if (args.where.id === testUser.id) return testUser;
    return null;
  });

  app.use('/api/cart', cartRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ==================== TESTS ====================

describe('Cart Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();
  });

  describe('POST /api/cart/items', () => {
    it('should reject adding an out-of-stock item', async () => {
      // Setup: cart exists, product is out of stock (quantity=0)
      mockPrisma.cart.findFirst.mockResolvedValue(testCart); // user has a cart
      mockPrisma.product.findUnique.mockResolvedValue({
        ...testProduct,
        stockQuantity: 0,
        trackInventory: true,
      });

      const res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', getAuthCookie(testUser))
        .send({ productId: testProduct.id, quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('out of stock');
    });

    it('should reject adding an item if requested quantity exceeds stock', async () => {
      mockPrisma.cart.findFirst.mockResolvedValue(testCart); // user has a cart
      mockPrisma.product.findUnique.mockResolvedValue({
        ...testProduct,
        stockQuantity: 5,
        trackInventory: true,
      });

      const res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', getAuthCookie(testUser))
        .send({ productId: testProduct.id, quantity: 10 }); // Wants 10, only 5 available

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Insufficient stock');
    });

    it('should recalculate totals when an item is added successfully', async () => {
      mockPrisma.cart.findFirst.mockResolvedValue(testCart); 
      mockPrisma.product.findUnique.mockResolvedValue(testProduct);
      
      // Simulate that cart has 1 item already, adding a new item creates it.
      mockPrisma.cartItem.findFirst.mockResolvedValue(null); // Not in cart yet
      mockPrisma.cartItem.create.mockResolvedValue({});
      
      // We expect the final output to fetch the cart with nested items to calculate the total
      mockPrisma.cart.findUnique.mockResolvedValue({
        ...testCart,
        items: [
          ...testCart.items,
          {
            id: 'newitem1',
            quantity: 2,
            priceAtAddInPesewas: testProduct.priceInPesewas,
            product: testProduct
          }
        ]
      });

      const res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', getAuthCookie(testUser))
        .send({ productId: testProduct.id, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // The total should be 4 * product price (2 from testCart + 2 new)
      const expectedTotal = (2 * testProduct.priceInPesewas) + (2 * testProduct.priceInPesewas);
      expect(res.body.data.cart.totalInPesewas).toBe(expectedTotal);
    });
  });

  describe('POST /api/cart/merge', () => {
    it('should successfully merge a guest cart into a user cart', async () => {
      // Mock guest cart with an item
      const guestCart = {
        id: 'guestcart-123',
        items: [
          {
            id: 'gitem-1',
            productId: 'some-prod',
            quantity: 1,
            priceAtAddInPesewas: 50000,
            product: { priceInPesewas: 50000 }
          }
        ]
      };
      
      // Mock existing user cart
      const userCart = {
        id: 'usercart-123',
        items: [
          {
            id: 'uitem-1',
            productId: 'other-prod',
            quantity: 2,
            priceAtAddInPesewas: 20000,
            product: { priceInPesewas: 20000 }
          }
        ]
      };

      // Ensure transaction works
      mockPrisma.$transaction.mockImplementation(async (callback: Function) => callback(mockPrisma));
      
      mockPrisma.cart.findUnique
        .mockResolvedValueOnce(guestCart) // 1. fetch guest cart
        .mockResolvedValueOnce(userCart)  // 2. fetch user cart
        .mockResolvedValue({              // 3. fetch final merged cart to return
          id: 'usercart-123',
          items: [...userCart.items, guestCart.items[0]]
        });

      mockPrisma.cartItem.upsert.mockResolvedValue({});
      mockPrisma.cart.delete.mockResolvedValue({});

      const res = await request(app)
        .post('/api/cart/merge')
        .set('Cookie', getAuthCookie(testUser))
        .send({ guestCartId: 'guestcart-123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Ensure the items are now grouped
      expect(res.body.data.cart.items.length).toBe(2);
      expect(mockPrisma.cart.delete).toHaveBeenCalledWith({ where: { id: 'guestcart-123' }});
    });
    
    it('should return 404 if guest cart not found', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/cart/merge')
        .set('Cookie', getAuthCookie(testUser))
        .send({ guestCartId: 'nonexistent-session' });

      expect(res.status).toBe(404);
    });
  });
});
