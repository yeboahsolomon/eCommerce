import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../utils/adminJwt.js';
import { adminAuthService } from '../services/admin-auth.service.js';
import { ApiError } from './error.middleware.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      admin?: {
        adminId: string;
        email: string;
        role: 'superadmin';
      };
    }
  }
}

export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.admin_token;

    if (!token) {
      throw new ApiError(401, 'Admin authentication required.');
    }

    const decoded = verifyAdminToken(token);
    if (!decoded) {
      throw new ApiError(401, 'Invalid or expired admin token.');
    }

    // Verify admin still exists and is active
    const admin = await adminAuthService.getAdminById(decoded.adminId);
    if (!admin) {
      throw new ApiError(401, 'Admin account not found.');
    }

    if (!admin.isActive) {
      throw new ApiError(403, 'Admin account has been deactivated.');
    }

    req.admin = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
