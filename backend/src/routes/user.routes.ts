import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { ApiResponseHandler } from '../utils/response.js';

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

export default router;
