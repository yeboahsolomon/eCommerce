/**
 * Google Auth Flow Tests
 * Tests: Creates new account on first login, links to existing account, error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  mockPrisma,
  testUser,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock Google Auth Library
vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => {
      return {
        verifyIdToken: vi.fn(),
      };
    }),
  };
});

import { OAuth2Client } from 'google-auth-library';
import googleAuthRoutes from '../routes/google-auth.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', googleAuthRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ==================== TESTS ====================

describe('Google Auth Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();
  });

  describe('POST /api/auth/google', () => {
    it('should create a new account when user does not exist', async () => {
      const mockTicket = {
        getPayload: () => ({
          email: 'newgoogleuser@test.com',
          given_name: 'John',
          family_name: 'Doe',
          picture: 'https://example.com/pic.jpg',
          sub: '12345',
        }),
      };

      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockTicket);
      (OAuth2Client as any).mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'clnewgoogleuser0001',
        email: 'newgoogleuser@test.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'BUYER',
        status: 'ACTIVE',
        emailVerified: true,
        avatarUrl: 'https://example.com/pic.jpg',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      // Need to override the instantiated client inside the route file
      // Vitest hoists vi.mock so the route already gets the mocked OAuth2Client class.

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid_google_id_token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newgoogleuser@test.com');
      expect(res.body.data.accessToken).toBeDefined();

      const cookiesStr = res.headers['set-cookie']?.join('; ');
      expect(cookiesStr).toContain('accessToken=');
      expect(cookiesStr).toContain('refreshToken=');
      
      // Verify DB interactions
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should login an existing user and update missing details', async () => {
      const mockTicket = {
        getPayload: () => ({
          email: testUser.email,
          given_name: 'Updated',
          family_name: 'Name',
          picture: 'https://example.com/newpic.jpg',
          sub: '12345',
        }),
      };

      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockTicket);
      (OAuth2Client as any).mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));

      // User exists, but doesn't have an avatarUrl
      mockPrisma.user.findUnique.mockResolvedValue({
        ...testUser,
        avatarUrl: null,
      });

      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        avatarUrl: 'https://example.com/newpic.jpg',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid_google_id_token' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should return 401 for invalid Google token payload', async () => {
      const mockTicket = {
        getPayload: () => null, // Invalid payload
      };

      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockTicket);
      (OAuth2Client as any).mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'invalid_token' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid Google token payload');
    });

    it('should return 400 if ID token is missing', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({}); // missing credential

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Google ID token is required');
    });
    
    it('should return 403 for suspended account', async () => {
      const mockTicket = {
        getPayload: () => ({
          email: testUser.email,
          given_name: 'John',
        }),
      };

      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockTicket);
      (OAuth2Client as any).mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));

      mockPrisma.user.findUnique.mockResolvedValue({
        ...testUser,
        status: 'SUSPENDED',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid_google_id_token' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('suspended');
    });
  });
});
