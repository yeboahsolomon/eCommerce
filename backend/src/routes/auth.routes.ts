import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiResponseHandler } from '../utils/response.js';
import { authService } from '../services/auth.service.js';
import {
  registerSchema, loginSchema,
  verifyEmailSchema, forgotPasswordSchema,
  resetPasswordSchema, changePasswordSchema,
  RegisterInput, LoginInput,
  VerifyEmailInput, ForgotPasswordInput,
  ResetPasswordInput, ChangePasswordInput,
  stepUpSchema, StepUpInput,
} from '../utils/validators.js';
import { loginLimiter, passwordResetLimiter, emailVerifyLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

// ============================================================
// Cookie Helpers
// ============================================================

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string, rememberMe = false) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, 
  });

  const refreshTokenOptions: any = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  };

  if (rememberMe) {
    refreshTokenOptions.maxAge = 7 * 24 * 60 * 60 * 1000;
  }

  res.cookie('refreshToken', refreshToken, refreshTokenOptions);
};

// ============================================================
// POST /api/auth/register  (alias: /signup)
// ============================================================

const registerHandler = [
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.register(req.body as RegisterInput);
      setAuthCookies(res, data.accessToken, data.refreshToken);
      
      return ApiResponseHandler.success(
        res,
        { user: data.user },
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
// ============================================================

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as LoginInput & { rememberMe?: boolean };
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const data = await authService.login({ ...input, ipAddress, userAgent });

      if (data.otpRequired) {
        return ApiResponseHandler.success(res, {
          otpRequired: true,
          preAuthToken: data.preAuthToken,
          user: data.user,
        }, 'Phone verification required.');
      }

      setAuthCookies(res, data.accessToken!, data.refreshToken!, input.rememberMe);
      
      return ApiResponseHandler.success(res, {
        user: data.user,
      }, 'Login successful!');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/verify-admin-otp
// ============================================================

router.post(
  '/verify-admin-otp',
  loginLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { preAuthToken, firebaseIdToken } = req.body;
      if (!preAuthToken || !firebaseIdToken) {
        throw new Error('Missing required tokens');
      }

      const data = await authService.verifyAdminOtp(preAuthToken, firebaseIdToken);
      setAuthCookies(res, data.accessToken, data.refreshToken, false);
      
      return ApiResponseHandler.success(res, {
        user: data.user,
      }, 'Login successful!');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/verify-email
// ============================================================

router.post(
  '/verify-email',
  emailVerifyLimiter,
  validate(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body as VerifyEmailInput;
      const result = await authService.verifyEmail(token);
      
      if (result.alreadyVerified) {
        return ApiResponseHandler.success(res, null, 'Email is already verified.');
      }
      return ApiResponseHandler.success(res, null, 'Email verified successfully! 🎉');
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/verify-email/:token',
  emailVerifyLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    req.body = { token: req.params.token };
    next();
  },
  validate(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body as VerifyEmailInput;
      const result = await authService.verifyEmail(token);
      
      if (result.alreadyVerified) {
        return ApiResponseHandler.success(res, null, 'Email is already verified.');
      }
      return ApiResponseHandler.success(res, null, 'Email verified successfully! 🎉');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/resend-verification
// ============================================================

router.post(
  '/resend-verification',
  emailVerifyLimiter,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.resendVerification(req.user!.id);
      
      if (result.alreadyVerified) {
        return ApiResponseHandler.success(res, null, 'Email is already verified.');
      }
      return ApiResponseHandler.success(res, null, 'Verification email sent. Check your inbox.');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/forgot-password
// ============================================================

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as ForgotPasswordInput;
      await authService.forgotPassword(email);
      return ApiResponseHandler.success(res, null, 'If that email exists, we\'ve sent a password reset link.');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/reset-password
// ============================================================

router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body as ResetPasswordInput;
      await authService.resetPassword(token, newPassword);
      return ApiResponseHandler.success(res, null, 'Password reset successfully. Please login with your new password.');
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/reset-password/:token',
  passwordResetLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.params.token;
      const { newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      return ApiResponseHandler.success(res, null, 'Password reset successfully. Please login with your new password.');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/change-password
// ============================================================

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.changePassword(req.user!.id, req.body as ChangePasswordInput);
      setAuthCookies(res, data.accessToken, data.refreshToken);
      return ApiResponseHandler.success(
        res,
        null,
        'Password changed successfully. All other sessions have been logged out.'
      );
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/step-up
// ============================================================

router.post(
  '/step-up',
  loginLimiter,
  authenticate,
  validate(stepUpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password } = req.body as StepUpInput;
      const stepUpToken = await authService.stepUpAuth(req.user!.id, password);
      
      res.cookie('stepUpToken', stepUpToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, 
      });

      return ApiResponseHandler.success(res, null, 'Step-up authentication successful.');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/refresh
// ============================================================

const refreshHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      const data = await authService.refreshToken(refreshToken);
      
      setAuthCookies(res, data.accessToken, data.refreshToken);
      return ApiResponseHandler.success(res, null, 'Token refreshed');
    } catch (error) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth' });
      next(error);
    }
  };

router.post('/refresh', refreshHandler);
router.post('/refresh-token', refreshHandler);

// ============================================================
// POST /api/auth/logout
// ============================================================

router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      await authService.logout(refreshToken);

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
// ============================================================

router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getMe(req.user!.id);
      return ApiResponseHandler.success(res, { user });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// PUT /api/auth/me
// ============================================================

router.put(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, phone } = req.body;
      const user = await authService.updateMe(req.user!.id, { firstName, lastName, phone });
      return ApiResponseHandler.success(res, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
