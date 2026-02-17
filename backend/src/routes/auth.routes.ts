import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { config } from '../config/env.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { ApiResponseHandler } from '../utils/response.js';
import { emailService } from '../services/email.service.js';
import {
  registerSchema, loginSchema,
  verifyEmailSchema, forgotPasswordSchema,
  resetPasswordSchema, changePasswordSchema,
  RegisterInput, LoginInput,
  VerifyEmailInput, ForgotPasswordInput,
  ResetPasswordInput, ChangePasswordInput,
} from '../utils/validators.js';
import {
  hashPassword, comparePassword,
  generateToken, generateRefreshToken, generateSecureToken,
} from '../utils/helpers.js';
import { hashToken } from '../utils/token.helpers.js';

const router = Router();

// ============================================================
// Cookie Helpers
// ============================================================

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  // Access Token: Short lived (15m)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours for dev convenience 
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

// ============================================================
// POST /api/auth/register  (alias: /signup)
// Create a new user account + send verification email
// ============================================================

const registerHandler = [
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
          emailVerified: true,
          createdAt: true,
        },
      });
      
      // Generate auth tokens
      const accessToken = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      
      const refreshToken = generateRefreshToken({ userId: user.id });
      const refreshTokenHash = hashToken(refreshToken);

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Generate email verification token
      const { token: verifyToken, hash: verifyHash } = generateSecureToken();

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verifyHash,
          expiresAt: new Date(Date.now() + config.emailVerificationExpiresIn),
        },
      });

      // Send verification email (non-blocking — don't fail registration if email fails)
      emailService.sendVerificationEmail(user.email, user.firstName, verifyToken).catch((err) => {
        console.error('Failed to send verification email:', err);
      });

      setAuthCookies(res, accessToken, refreshToken);
      
      return ApiResponseHandler.success(
        res,
        { user, accessToken },
        'Account created successfully! Please check your email to verify your account.',
        201
      );
    } catch (error) {
      next(error);
    }
  },
];

router.post('/register', ...registerHandler);
router.post('/signup', ...registerHandler);

// ============================================================
// POST /api/auth/login
// Authenticate user and return JWTs
// ============================================================

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
      
      // Generate tokens
      const accessToken = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({ userId: user.id });
      const refreshTokenHash = hashToken(refreshToken);

      // Store refresh token
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
          emailVerified: user.emailVerified,
        },
        accessToken,
      }, 'Login successful!');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/verify-email
// Verify user's email address using token from email link
// ============================================================

router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body as VerifyEmailInput;

      // Hash the incoming token to compare with stored hash
      const tokenHash = hashToken(token);

      const storedToken = await prisma.emailVerificationToken.findUnique({
        where: { token: tokenHash },
        include: { user: true },
      });

      if (!storedToken) {
        throw new ApiError(400, 'Invalid or expired verification link.');
      }

      if (new Date() > storedToken.expiresAt) {
        // Expired — delete it
        await prisma.emailVerificationToken.delete({ where: { id: storedToken.id } });
        throw new ApiError(400, 'Verification link has expired. Please request a new one.');
      }

      if (storedToken.user.emailVerified) {
        // Already verified — clean up token
        await prisma.emailVerificationToken.delete({ where: { id: storedToken.id } });
        return ApiResponseHandler.success(res, null, 'Email is already verified.');
      }

      // Verify the email + delete token (transaction)
      await prisma.$transaction([
        prisma.user.update({
          where: { id: storedToken.userId },
          data: { emailVerified: true },
        }),
        prisma.emailVerificationToken.deleteMany({
          where: { userId: storedToken.userId }, // Delete ALL tokens for this user
        }),
      ]);

      // Send welcome email (non-blocking)
      emailService.sendWelcomeEmail(storedToken.user.email, storedToken.user.firstName).catch((err) => {
        console.error('Failed to send welcome email:', err);
      });

      return ApiResponseHandler.success(res, null, 'Email verified successfully! 🎉');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/verify-email/:token  (URL-param variant)
router.post(
  '/verify-email/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    // Inject the URL param into body and forward to the body-based handler
    req.body = { token: req.params.token };
    next();
  },
  validate(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body as VerifyEmailInput;
      const tokenHash = hashToken(token);

      const storedToken = await prisma.emailVerificationToken.findUnique({
        where: { token: tokenHash },
        include: { user: true },
      });

      if (!storedToken) {
        throw new ApiError(400, 'Invalid or expired verification link.');
      }

      if (new Date() > storedToken.expiresAt) {
        await prisma.emailVerificationToken.delete({ where: { id: storedToken.id } });
        throw new ApiError(400, 'Verification link has expired. Please request a new one.');
      }

      if (storedToken.user.emailVerified) {
        await prisma.emailVerificationToken.delete({ where: { id: storedToken.id } });
        return ApiResponseHandler.success(res, null, 'Email is already verified.');
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: storedToken.userId },
          data: { emailVerified: true },
        }),
        prisma.emailVerificationToken.deleteMany({
          where: { userId: storedToken.userId },
        }),
      ]);

      emailService.sendWelcomeEmail(storedToken.user.email, storedToken.user.firstName).catch((err) => {
        console.error('Failed to send welcome email:', err);
      });

      return ApiResponseHandler.success(res, null, 'Email verified successfully! 🎉');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/resend-verification
// Resend verification email (authenticated user)
// ============================================================

router.post(
  '/resend-verification',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, firstName: true, emailVerified: true },
      });

      if (!user) {
        throw new ApiError(404, 'User not found.');
      }

      if (user.emailVerified) {
        return ApiResponseHandler.success(res, null, 'Email is already verified.');
      }

      // Delete any existing verification tokens for this user
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      });

      // Generate new token
      const { token, hash } = generateSecureToken();

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: hash,
          expiresAt: new Date(Date.now() + config.emailVerificationExpiresIn),
        },
      });

      // Send email
      await emailService.sendVerificationEmail(user.email, user.firstName, token);

      return ApiResponseHandler.success(res, null, 'Verification email sent. Check your inbox.');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/forgot-password
// Request password reset link (public)
// Always returns 200 to prevent email enumeration
// ============================================================

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as ForgotPasswordInput;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true, firstName: true, status: true },
      });

      // Always return the same message to prevent email enumeration
      const successMessage = 'If that email exists, we\'ve sent a password reset link.';

      if (!user || user.status !== 'ACTIVE') {
        return ApiResponseHandler.success(res, null, successMessage);
      }

      // Delete any existing reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Generate new reset token
      const { token, hash } = generateSecureToken();

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hash,
          expiresAt: new Date(Date.now() + config.passwordResetExpiresIn),
        },
      });

      // Send reset email (non-blocking)
      emailService.sendPasswordResetEmail(user.email, user.firstName, token).catch((err) => {
        console.error('Failed to send password reset email:', err);
      });

      return ApiResponseHandler.success(res, null, successMessage);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/reset-password
// Reset password using token from email link
// Invalidates all refresh tokens (logs out everywhere)
// ============================================================

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body as ResetPasswordInput;

      const tokenHash = hashToken(token);

      const storedToken = await prisma.passwordResetToken.findUnique({
        where: { token: tokenHash },
      });

      if (!storedToken) {
        throw new ApiError(400, 'Invalid or expired reset link.');
      }

      if (storedToken.used) {
        throw new ApiError(400, 'This reset link has already been used.');
      }

      if (new Date() > storedToken.expiresAt) {
        await prisma.passwordResetToken.delete({ where: { id: storedToken.id } });
        throw new ApiError(400, 'Reset link has expired. Please request a new one.');
      }

      const hashedPassword = await hashPassword(newPassword);

      // Update password + mark token used + revoke all refresh tokens (transaction)
      await prisma.$transaction([
        prisma.user.update({
          where: { id: storedToken.userId },
          data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: storedToken.id },
          data: { used: true },
        }),
        // Invalidate ALL sessions — force re-login
        prisma.refreshToken.deleteMany({
          where: { userId: storedToken.userId },
        }),
      ]);

      return ApiResponseHandler.success(res, null, 'Password reset successfully. Please login with your new password.');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/reset-password/:token  (URL-param variant)
router.post(
  '/reset-password/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.params.token;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        throw new ApiError(400, 'New password must be at least 6 characters.');
      }

      const tokenHash = hashToken(token);

      const storedToken = await prisma.passwordResetToken.findUnique({
        where: { token: tokenHash },
      });

      if (!storedToken) {
        throw new ApiError(400, 'Invalid or expired reset link.');
      }

      if (storedToken.used) {
        throw new ApiError(400, 'This reset link has already been used.');
      }

      if (new Date() > storedToken.expiresAt) {
        await prisma.passwordResetToken.delete({ where: { id: storedToken.id } });
        throw new ApiError(400, 'Reset link has expired. Please request a new one.');
      }

      const hashedPassword = await hashPassword(newPassword);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: storedToken.userId },
          data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: storedToken.id },
          data: { used: true },
        }),
        prisma.refreshToken.deleteMany({
          where: { userId: storedToken.userId },
        }),
      ]);

      return ApiResponseHandler.success(res, null, 'Password reset successfully. Please login with your new password.');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/change-password
// Change password while authenticated (requires current password)
// ============================================================

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body as ChangePasswordInput;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, password: true },
      });

      if (!user) {
        throw new ApiError(404, 'User not found.');
      }

      // Verify current password
      const isValid = await comparePassword(currentPassword, user.password);
      if (!isValid) {
        throw new ApiError(401, 'Current password is incorrect.');
      }

      // Prevent reusing the same password
      const isSamePassword = await comparePassword(newPassword, user.password);
      if (isSamePassword) {
        throw new ApiError(400, 'New password must be different from your current password.');
      }

      const hashedPassword = await hashPassword(newPassword);

      // Update password + invalidate all other sessions
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        }),
        // Delete all refresh tokens except NONE (force re-login everywhere)
        prisma.refreshToken.deleteMany({
          where: { userId: user.id },
        }),
      ]);

      // Generate new tokens for current session
      const accessToken = generateToken({
        userId: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
      });
      const refreshToken = generateRefreshToken({ userId: req.user!.id });
      const refreshTokenHash = hashToken(refreshToken);

      await prisma.refreshToken.create({
        data: {
          userId: req.user!.id,
          token: refreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      setAuthCookies(res, accessToken, refreshToken);

      return ApiResponseHandler.success(
        res,
        { accessToken },
        'Password changed successfully. All other sessions have been logged out.'
      );
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/refresh  (alias: /refresh-token)
// Refresh Access Token using Refresh Token cookie
// ============================================================

const refreshHandler = async (req: Request, res: Response, next: NextFunction) => {
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
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        throw new ApiError(401, 'Invalid refresh token.');
      }

      if (storedToken.revoked) {
        // Potential theft — delete and clear
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

      // Valid! Rotate token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });

      const newRefreshToken = generateRefreshToken({ userId: storedToken.userId });
      const newRefreshTokenHash = hashToken(newRefreshToken);

      await prisma.refreshToken.create({
        data: {
          userId: storedToken.userId,
          token: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // New access token
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
  };

router.post('/refresh', refreshHandler);
router.post('/refresh-token', refreshHandler);

// ============================================================
// POST /api/auth/logout
// Revoke refresh token and clear cookies
// ============================================================

router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        const refreshTokenHash = hashToken(refreshToken);
        
        try {
          const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshTokenHash } });
          if (storedToken) {
             await prisma.refreshToken.delete({ where: { id: storedToken.id } });
          }
        } catch {
          // ignore — token may already be gone
        }
      }

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth' });
      
      return ApiResponseHandler.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// GET /api/auth/me
// Get current authenticated user profile
// ============================================================

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

// ============================================================
// PUT /api/auth/me
// Update current user profile
// ============================================================

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
