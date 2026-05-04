import { Router, Request, Response, NextFunction } from 'express';
import { adminAuthService } from '../services/admin-auth.service.js';
import { signAdminToken } from '../utils/adminJwt.js';
import { requireSuperAdmin } from '../middleware/admin-auth.middleware.js';
import { ApiResponseHandler } from '../utils/response.js';
import { config } from '../config/env.js';

const router = Router();

// ============================================================
// POST /api/admin/auth/login
// ============================================================
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return ApiResponseHandler.error(res, 'Email and password are required', 400);
    }

    const admin = await adminAuthService.getAdminByEmail(email);
    
    if (!admin) {
      return ApiResponseHandler.error(res, 'Invalid credentials', 401);
    }

    if (!admin.isActive) {
      return ApiResponseHandler.error(res, 'Admin account has been deactivated', 403);
    }

    // Check if account is locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return ApiResponseHandler.error(res, 'Account locked due to too many failed attempts. Try again later.', 403);
    }

    const isMatch = await adminAuthService.comparePassword(password, admin.passwordHash);

    if (!isMatch) {
      await adminAuthService.handleFailedLogin(admin.id, admin.failedLoginAttempts);
      // The service throws an ApiError which will be caught by the error handler
      return; 
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await adminAuthService.handleSuccessfulLogin(admin.id, ipAddress);

    const token = signAdminToken({
      adminId: admin.id,
      email: admin.email,
      role: 'superadmin',
    });

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    return res.json({
      success: true,
      admin: {
        name: admin.name,
        email: admin.email,
        role: 'superadmin',
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/admin/auth/logout
// ============================================================
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('admin_token', { path: '/' });
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/admin/auth/me
// ============================================================
router.get('/me', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = req.admin!.adminId;
    const admin = await adminAuthService.getAdminById(adminId);
    
    if (!admin) {
      return ApiResponseHandler.error(res, 'Admin not found', 404);
    }

    return res.json({ success: true, admin });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/admin/auth/change-password
// ============================================================
router.post('/change-password', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return ApiResponseHandler.error(res, 'Current and new passwords are required', 400);
    }

    const adminId = req.admin!.adminId;
    // We need the full record to get the hash
    const admin = await prisma.superAdmin.findUnique({ where: { id: adminId } });
    
    if (!admin) {
      return ApiResponseHandler.error(res, 'Admin not found', 404);
    }

    const isMatch = await adminAuthService.comparePassword(currentPassword, admin.passwordHash);
    
    if (!isMatch) {
      return ApiResponseHandler.error(res, 'Incorrect current password', 401);
    }

    const newHash = await adminAuthService.hashPassword(newPassword);
    
    await prisma.superAdmin.update({
      where: { id: adminId },
      data: { passwordHash: newHash }
    });

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

import prisma from '../config/database.js'; // imported for change-password route

export default router;
