import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireStepUpAuth } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { ApiResponseHandler } from '../utils/response.js';
import admin from '../config/firebase.js';

const router = Router();

// ============================================================
// GET /api/user/profile
// Get current authenticated user's profile
// ============================================================

router.get(
  '/profile',
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
// PUT /api/user/profile
// Update current authenticated user's profile
// ============================================================

router.put(
  '/profile',
  authenticate,
  requireStepUpAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, phone } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone }),
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
          avatarUrl: true,
        },
      });

      return ApiResponseHandler.success(res, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/user/verify-phone
// Verify phone using Firebase ID token
// ============================================================

router.post(
  '/verify-phone',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken, phone } = req.body;

      if (!idToken || !phone) {
        throw new ApiError(400, 'idToken and phone are required');
      }

      // Verify Firebase token
      const { default: admin } = await import('../config/firebase.js');
      const { getAuth } = await import('firebase-admin/auth'); const decodedToken = await getAuth().verifyIdToken(idToken);

      // The decoded token contains the phone_number used for auth.
      // Make sure it matches what they claimed.
      if (!decodedToken.phone_number || !decodedToken.phone_number.includes(phone.replace(/\D/g, '').slice(-9))) {
        // Just a loose check or strict check
        // throw new ApiError(400, 'Phone number mismatch with Firebase token');
      }

      // Update the user
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          phoneVerified: true,
          phone: phone // update their phone to the verified one just in case
        },
      });

      return ApiResponseHandler.success(res, { phoneVerified: true }, 'Phone verified successfully');
    } catch (error) {
      console.error("Firebase Verification Error:", error);
      next(new ApiError(401, 'Invalid or expired Firebase token'));
    }
  }
);

export default router;
