import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { config } from '../config/env.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { ApiResponseHandler } from '../utils/response.js';
import { registerSchema, loginSchema, RegisterInput, LoginInput } from '../utils/validators.js';
import { hashPassword, comparePassword, generateToken, generateRefreshToken } from '../utils/helpers.js';
import { hashToken } from '../utils/token.helpers.js';

const router = Router();

// Helper to set cookies
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  // Access Token: Short lived (15m)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, 
  });

  // Refresh Token: Long lived (7d)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/auth', // Scope to auth routes (refresh/logout)
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });
};

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body as RegisterInput;
      
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      
      if (existingUser) {
        throw new ApiError(409, 'An account with this email already exists.');
      }
      
      const hashedPassword = await hashPassword(password);
      
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'BUYER',
          status: 'ACTIVE',
          cart: { create: {} },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
      
      // Generate Tokens
      const accessToken = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      
      const refreshToken = generateRefreshToken({ userId: user.id });
      const refreshTokenHash = hashToken(refreshToken);

      // Store Refresh Token
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      setAuthCookies(res, accessToken, refreshToken);
      
      // Return Access Token (for mobile apps/local storage if needed) + User
      return ApiResponseHandler.success(res, { user, accessToken }, 'Account created successfully!', 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user and return JWTs
 */
router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as LoginInput;
      
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      
      if (!user) {
        throw new ApiError(401, 'Invalid email or password.');
      }
      
      if (user.status !== 'ACTIVE') {
        throw new ApiError(403, 'Your account has been suspended or deactivated.');
      }
      
      const isValidPassword = await comparePassword(password, user.password);
      
      if (!isValidPassword) {
        throw new ApiError(401, 'Invalid email or password.');
      }
      
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      
      // Generate Tokens
      const accessToken = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({ userId: user.id });
      const refreshTokenHash = hashToken(refreshToken);

      // Store Refresh Token
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      setAuthCookies(res, accessToken, refreshToken);
      
      return ApiResponseHandler.success(res, {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
        },
        accessToken,
      }, 'Login successful!');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh Access Token using Refresh Token cookie
 */
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        throw new ApiError(401, 'No refresh token provided.');
      }

      const refreshTokenHash = hashToken(refreshToken);

      // Find token in DB
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshTokenHash },
        include: { user: true },
      });

      if (!storedToken) {
        // Token Reuse Detection could happen here (if we tracked families)
        // For now, simple invalid
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        throw new ApiError(401, 'Invalid refresh token.');
      }

      if (storedToken.revoked) {
        // Potential theft
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        throw new ApiError(401, 'Token revoked.');
      }

      if (new Date() > storedToken.expiresAt) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        throw new ApiError(401, 'Session expired. Please login again.');
      }

      // Valid! Rotate Token
      // Delete old
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });

      // Create new
      const newRefreshToken = generateRefreshToken({ userId: storedToken.userId });
      const newRefreshTokenHash = hashToken(newRefreshToken);

      await prisma.refreshToken.create({
        data: {
          userId: storedToken.userId,
          token: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // New Access Token
      const newAccessToken = generateToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
      });

      setAuthCookies(res, newAccessToken, newRefreshToken);

      return ApiResponseHandler.success(res, { accessToken: newAccessToken }, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Revoke refresh token and clear cookies
 */
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        const refreshTokenHash = hashToken(refreshToken);
        
        // Revoke in DB
        // We delete it for cleanliness, or mark revoked if audit needed.
        // Let's delete to keep table small.
        try {
          // Attempt delete, might fail if already gone or invalid (ignore)
          const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshTokenHash } });
          if (storedToken) {
             await prisma.refreshToken.delete({ where: { id: storedToken.id } });
          }
        } catch (e) {
          // ignore
        }
      }

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth' }); // Path must match
      
      return ApiResponseHandler.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          avatarUrl: true,
          createdAt: true,
          lastLoginAt: true,
          addresses: {
            orderBy: [
              { isDefault: 'desc' },
              { createdAt: 'desc' },
            ],
          },
        },
      });
      
      if (!user) {
        throw new ApiError(404, 'User not found.');
      }
      
      return ApiResponseHandler.success(res, { user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/auth/me
 * Update current user profile
 */
router.put(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, phone } = req.body;
      
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          firstName,
          lastName,
          phone,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          avatarUrl: true,
        },
      });
      
      return ApiResponseHandler.success(res, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
