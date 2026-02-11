/**
 * Auth Flow Tests
 * Tests: register, login, profile, logout
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
      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue({
        id: 'clnewuser0000000000001',
        email: validPayload.email.toLowerCase(),
        firstName: validPayload.firstName,
        lastName: validPayload.lastName,
        phone: validPayload.phone,
        role: 'BUYER',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validPayload.email.toLowerCase());
      expect(res.body.data.token).toBeDefined();

      // Verify HttpOnly cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('accessToken=');
      expect(cookieStr).toContain('HttpOnly');
    });

    it('should return 409 if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUser); // User exists

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
        .send({ email: 'bad' }); // Missing password, firstName, lastName

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ===== LOGIN =====

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and set cookie', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(testUser); // lastLoginAt update

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'correctpassword' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.token).toBeDefined();

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
