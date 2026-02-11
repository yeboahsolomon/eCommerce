/**
 * Shared test utilities for backend integration tests.
 * Provides mocked Prisma, test fixtures, Express app builder, and JWT helpers.
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { vi } from 'vitest';
import { config } from '../config/env.js';

// ==================== MOCK PRISMA ====================

// Create a deeply-mocked Prisma client.
// Each model exposes the standard Prisma CRUD methods as vi.fn() stubs.
function createMockModel() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  };
}

export const mockPrisma = {
  user: createMockModel(),
  address: createMockModel(),
  sellerProfile: createMockModel(),
  category: createMockModel(),
  product: createMockModel(),
  productImage: createMockModel(),
  review: createMockModel(),
  wishlist: createMockModel(),
  wishlistItem: createMockModel(),
  cart: createMockModel(),
  cartItem: createMockModel(),
  order: createMockModel(),
  orderItem: createMockModel(),
  payment: createMockModel(),
  refund: createMockModel(),
  inventoryLog: createMockModel(),
  coupon: createMockModel(),
  $transaction: vi.fn(),
};

// ==================== MOCK PAYMENT SERVICES ====================

export const mockMomoService = {
  formatPhoneNumber: vi.fn((phone: string) => '233' + phone.substring(1)),
  isValidMTNNumber: vi.fn(() => true),
  requestToPay: vi.fn(),
  getPaymentStatus: vi.fn(),
  cancelPayment: vi.fn(),
  generateReferenceId: vi.fn(() => 'mock-momo-ref-123'),
};

export const mockPaystackService = {
  generateReference: vi.fn(() => 'GHM-TEST-REF123'),
  initializeTransaction: vi.fn(),
  verifyTransaction: vi.fn(),
  verifyWebhookSignature: vi.fn(),
  getBanks: vi.fn(),
  createRefund: vi.fn(),
  getPublicKey: vi.fn(() => 'pk_test_mock'),
};

// ==================== TEST FIXTURES ====================

export const testUser = {
  id: 'cltest000000000000user01',
  email: 'buyer@test.com',
  password: '$2a$12$hashedpassword', // bcrypt hash placeholder
  firstName: 'Kwame',
  lastName: 'Asante',
  phone: '0241234567',
  role: 'BUYER' as const,
  status: 'ACTIVE' as const,
  emailVerified: false,
  phoneVerified: false,
  avatarUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  lastLoginAt: null,
};

export const testAdmin = {
  ...testUser,
  id: 'cltest000000000000admin1',
  email: 'admin@test.com',
  role: 'ADMIN' as const,
};

export const testProduct = {
  id: 'cltest0000000000product1',
  name: 'iPhone 15 Pro',
  slug: 'iphone-15-pro',
  description: 'Latest Apple smartphone',
  priceInPesewas: 1500000, // ₵15,000.00
  comparePriceInPesewas: 1800000,
  costInPesewas: 1200000,
  stockQuantity: 10,
  lowStockThreshold: 5,
  trackInventory: true,
  allowBackorder: false,
  sku: 'IP15P-001',
  barcode: null,
  categoryId: 'cltest00000000category1',
  sellerId: null,
  metaTitle: null,
  metaDescription: null,
  isActive: true,
  isFeatured: true,
  averageRating: 4.5,
  reviewCount: 12,
  weightInGrams: 200,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  images: [{ id: 'img1', url: '/uploads/iphone.jpg', altText: null, sortOrder: 0, isPrimary: true }],
};

export const testCart = {
  id: 'cltest00000000000cart001',
  userId: testUser.id,
  lastActivityAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'cltest0000000cartitem01',
      cartId: 'cltest00000000000cart001',
      productId: testProduct.id,
      quantity: 2,
      priceAtAddInPesewas: testProduct.priceInPesewas,
      product: {
        id: testProduct.id,
        name: testProduct.name,
        sku: testProduct.sku,
        priceInPesewas: testProduct.priceInPesewas,
        stockQuantity: testProduct.stockQuantity,
        trackInventory: testProduct.trackInventory,
        allowBackorder: testProduct.allowBackorder,
        isActive: true,
        images: [{ id: 'img1', url: '/uploads/iphone.jpg', altText: null, sortOrder: 0, isPrimary: true }],
      },
    },
  ],
};

export const testOrder = {
  id: 'cltest00000000000order01',
  orderNumber: 'GH-20260211-ABCD',
  userId: testUser.id,
  status: 'PAYMENT_PENDING',
  subtotalInPesewas: 3000000,
  shippingFeeInPesewas: 0,
  taxInPesewas: 0,
  discountInPesewas: 0,
  totalInPesewas: 3000000,
  shippingFullName: 'Kwame Asante',
  shippingPhone: '0241234567',
  shippingRegion: 'Greater Accra',
  shippingCity: 'Accra',
  shippingArea: 'Osu',
  shippingStreetAddress: '10 Oxford Street',
  shippingGpsAddress: 'GA-183-8164',
  customerEmail: 'buyer@test.com',
  customerPhone: '0241234567',
  deliveryMethod: 'standard',
  deliveryNotes: null,
  createdAt: new Date('2026-02-11'),
  updatedAt: new Date('2026-02-11'),
  items: [],
  payment: null,
};

export const testPayment = {
  id: 'cltest0000000000payment1',
  orderId: testOrder.id,
  amountInPesewas: 3000000,
  method: 'CARD' as const,
  status: 'PROCESSING' as const,
  gatewayProvider: 'paystack',
  gatewayReference: 'GHM-TEST-REF123',
  gatewayResponse: null,
  momoPhoneNumber: null,
  momoNetwork: null,
  cardLast4: null,
  cardBrand: null,
  failureReason: null,
  failureCode: null,
  initiatedAt: new Date(),
  confirmedAt: null,
  failedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  order: {
    id: testOrder.id,
    orderNumber: testOrder.orderNumber,
    userId: testUser.id,
  },
};

// ==================== JWT HELPERS ====================

export function generateTestToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

export function getAuthCookie(user: { id: string; email: string; role: string }): string {
  return `accessToken=${generateTestToken(user)}`;
}

// ==================== RESET HELPERS ====================

export function resetAllMocks() {
  // Reset $transaction explicitly (it's a fn on mockPrisma, not a model object)
  mockPrisma.$transaction.mockReset();

  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset();
        }
      });
    }
  });

  Object.values(mockMomoService).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  });

  Object.values(mockPaystackService).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  });

  // Re-apply default implementations
  mockMomoService.formatPhoneNumber.mockImplementation((phone: string) => '233' + phone.substring(1));
  mockMomoService.isValidMTNNumber.mockReturnValue(true);
  mockMomoService.generateReferenceId.mockReturnValue('mock-momo-ref-123');
  mockPaystackService.generateReference.mockReturnValue('GHM-TEST-REF123');
  mockPaystackService.getPublicKey.mockReturnValue('pk_test_mock');
}
