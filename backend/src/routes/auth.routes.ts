import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { registerSchema, loginSchema, RegisterInput, LoginInput } from '../utils/validators.js';
import { hashPassword, comparePassword, generateToken } from '../utils/helpers.js';

const router = Router();

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
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      
      if (existingUser) {
        throw new ApiError(409, 'An account with this email already exists.');
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user with cart
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'BUYER',
          status: 'ACTIVE',
          cart: {
            create: {},  // Create empty cart
          },
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
      
      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as LoginInput;
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      
      if (!user) {
        throw new ApiError(401, 'Invalid email or password.');
      }
      
      // Check if account is active
      if (user.status !== 'ACTIVE') {
        throw new ApiError(403, 'Your account has been suspended or deactivated.');
      }
      
      // Check password
      const isValidPassword = await comparePassword(password, user.password);
      
      if (!isValidPassword) {
        throw new ApiError(401, 'Invalid email or password.');
      }
      
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      
      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      
      res.json({
        success: true,
        message: 'Login successful!',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
          },
          token,
        },
      });
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
      
      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
