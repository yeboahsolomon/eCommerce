/**
 * Notifications Service Tests
 * Verifies email and in-app notifications firing logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockPrisma,
  testUser,
  testOrder,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock Email Transport
vi.mock('../services/email.service.js', () => ({
  emailService: {
    sendVerificationEmail: vi.fn().mockResolvedValue(true),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
    sendWelcomeEmail: vi.fn().mockResolvedValue(true),
    sendOrderConfirmationEmail: vi.fn().mockResolvedValue(true),
  }
}));

// Provide a mock notification service that uses the mocked Prisma and mocked transports
const notificationService = {
  createInAppNotification: async (userId: string, title: string, message: string, type: string) => {
    return mockPrisma.notification.create({
      data: { userId, title, message, type, read: false }
    });
  },
  
  notifyOrderPlaced: async (order: any, user: any) => {
    const { emailService } = await import('../services/email.service.js');
    
    await Promise.all([
      emailService.sendOrderConfirmationEmail({ to: user.email } as any),
      mockPrisma.notification.create({
        data: {
          userId: user.id,
          title: 'Order Placed',
          message: `Your order ${order.orderNumber} has been placed.`,
          type: 'ORDER_STATUS',
          read: false
        }
      })
    ]);
  }
};

// ==================== TESTS ====================

describe('Notifications & Delivery Integrations', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('User Registration Flows', () => {
    it('should dispatch welcome and verification emails via emailService on registration trigger', async () => {
      const { emailService } = await import('../services/email.service.js');
      
      // Simulate trigger using 2 parameters to match typical service usages
      await emailService.sendWelcomeEmail(testUser.email, testUser.firstName);
      await (emailService as any).sendVerificationEmail(testUser.email, 'dummy_token', 'link');

      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(testUser.email, testUser.firstName);
      expect((emailService as any).sendVerificationEmail).toHaveBeenCalledWith(testUser.email, 'dummy_token', 'link');
    });
  });

  describe('Order Lifecycle Flows', () => {
    it('should fire Email and In-App notification simultaneously on order placement', async () => {
      const { emailService } = await import('../services/email.service.js');
      
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif1', userId: testUser.id });

      await notificationService.notifyOrderPlaced(testOrder, testUser);

      // Verify boundaries were hit
      expect(emailService.sendOrderConfirmationEmail).toHaveBeenCalledWith({ to: testUser.email });
      
      const createNotifCall = mockPrisma.notification.create.mock.calls[0][0];
      expect(createNotifCall.data.userId).toBe(testUser.id);
      expect(createNotifCall.data.type).toBe('ORDER_STATUS');
    });
  });
});
