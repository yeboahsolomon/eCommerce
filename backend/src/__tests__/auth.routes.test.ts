/**
 * Auth Flow Tests
 * Tests: register, login, verify-email, forgot-password, reset-password, 
 *        change-password, profile, logout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  mockPrisma,
  testUser,
  getAuthCookie,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

// Mock Prisma before importing routes
vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$hashed_password_test'),
    compare: vi.fn(),
  },
  hash: vi.fn().mockResolvedValue('$2a$12$hashed_password_test'),
  compare: vi.fn(),
}));

// Mock email service (prevent actual email sending)
vi.mock('../services/email.service.js', () => ({
  emailService: {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

import bcrypt from 'bcryptjs';
import authRoutes from '../routes/auth.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ==================== TESTS ====================

describe('Auth Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();
  });

  // ===== REGISTER =====

  describe('POST /api/auth/register', () => {
    const validPayload = {
      email: 'newuser@test.com',
      password: 'password123',
      firstName: 'Ama',
      lastName: 'Mensah',
      phone: '0241234567',
    };

    it('should register a new user and set accessToken cookie', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'clnewuser0000000000001',
        email: validPayload.email.toLowerCase(),
        firstName: validPayload.firstName,
        lastName: validPayload.lastName,
        phone: validPayload.phone,
        role: 'BUYER',
        status: 'ACTIVE',
        emailVerified: false,
        createdAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.emailVerificationToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validPayload.email.toLowerCase());
      expect(res.body.data.accessToken).toBeDefined();

      // Verify HttpOnly cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('accessToken=');
      expect(cookieStr).toContain('HttpOnly');
    });

    it('should return 409 if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'bad' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ===== LOGIN =====

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and set cookie', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(testUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'correctpassword' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should return 401 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@test.com', password: 'password' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for suspended account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...testUser,
        status: 'SUSPENDED',
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'password' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('suspended');
    });
  });

  // ===== VERIFY EMAIL =====

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const mockStoredToken = {
        id: 'cltoken000000000001',
        userId: testUser.id,
        token: 'hashed_token',
        expiresAt: new Date(Date.now() + 86400000), // future
        user: { ...testUser, emailVerified: false },
      };
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'raw_token_from_email' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('verified');
    });

    it('should return 400 for invalid token', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'bad_token' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for expired token', async () => {
      const expiredToken = {
        id: 'cltoken000000000002',
        userId: testUser.id,
        token: 'hashed_token',
        expiresAt: new Date(Date.now() - 1000), // past
        user: testUser,
      };
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(expiredToken);
      mockPrisma.emailVerificationToken.delete.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'expired_token' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('expired');
    });
  });

  // ===== FORGOT PASSWORD =====

  describe('POST /api/auth/forgot-password', () => {
    it('should always return 200 (prevents email enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should send reset email for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({});
      mockPrisma.passwordResetToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ===== RESET PASSWORD =====

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const mockResetToken = {
        id: 'clreset0000000001',
        userId: testUser.id,
        token: 'hashed_reset_token',
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
      };
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'raw_reset_token', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('reset successfully');
    });

    it('should return 400 for invalid reset token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'bad_token', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for already-used token', async () => {
      const usedToken = {
        id: 'clreset0000000002',
        userId: testUser.id,
        token: 'hashed_used_token',
        expiresAt: new Date(Date.now() + 3600000),
        used: true,
      };
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(usedToken);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'used_token', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been used');
    });
  });

  // ===== CHANGE PASSWORD =====

  describe('POST /api/auth/change-password', () => {
    it('should change password when current password is correct', async () => {
      // First call for auth middleware, second for change-password handler
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(testUser) // auth middleware
        .mockResolvedValueOnce({ id: testUser.id, password: testUser.password }); // handler
      (bcrypt.compare as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true)  // current password check
        .mockResolvedValueOnce(false); // same-password check (passes)
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', getAuthCookie(testUser))
        .send({ currentPassword: 'oldpass', newPassword: 'newpass123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('changed successfully');
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should return 401 for incorrect current password', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(testUser)
        .mockResolvedValueOnce({ id: testUser.id, password: testUser.password });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', getAuthCookie(testUser))
        .send({ currentPassword: 'wrongpass', newPassword: 'newpass123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('incorrect');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: 'oldpass', newPassword: 'newpass123' });

      expect(res.status).toBe(401);
    });
  });

  // ===== GET /me =====

  describe('GET /api/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...testUser,
        addresses: [],
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', getAuthCookie(testUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });

  // ===== LOGOUT =====

  describe('POST /api/auth/logout', () => {
    it('should clear the accessToken cookie', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'];
      if (cookies) {
        const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
        expect(cookieStr).toContain('accessToken=');
      }
    });
  });
});
