import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../utils/adminJwt.js';
import { adminAuthService } from '../services/admin-auth.service.js';

// ─────────────────────────────────────────────────────────────
// Type Augmentation — attach the full SuperAdmin document to req
// ─────────────────────────────────────────────────────────────

/** Shape of the SuperAdmin record attached to `req.admin` (password excluded). */
export interface AdminRequestUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  lastLoginIP: string | null;
  createdAt: Date;
  /** Convenience alias so callers can use either `req.admin.id` or `req.admin.adminId`. */
  adminId: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminRequestUser;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Standardised 401 response
// ─────────────────────────────────────────────────────────────

const UNAUTHORIZED_RESPONSE = {
  success: false,
  error: 'Unauthorized',
  code: 'ADMIN_AUTH_FAILED',
} as const;

/**
 * Express middleware that protects admin-only routes.
 *
 * **Auth flow:**
 * 1. Extract `admin_token` from `req.cookies`
 * 2. Verify the JWT via `verifyAdminToken()`
 * 3. Look up the SuperAdmin record by `adminId`
 * 4. Confirm `isActive === true`
 * 5. Attach the full admin document to `req.admin`
 *
 * If **any** check fails the middleware returns a `401` JSON
 * response and **never** calls `next()`.
 *
 * @example
 * ```ts
 * router.use(requireSuperAdmin);
 * ```
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 1. Extract token from HTTP-only cookie
  const token = req.cookies?.admin_token;

  if (!token) {
    res.status(401).json(UNAUTHORIZED_RESPONSE);
    return;
  }

  // 2. Verify JWT signature + expiry
  const decoded = verifyAdminToken(token);

  if (!decoded) {
    res.status(401).json(UNAUTHORIZED_RESPONSE);
    return;
  }

  // 3. Look up the admin in the database
  const admin = await adminAuthService.getAdminById(decoded.adminId);

  if (!admin) {
    res.status(401).json(UNAUTHORIZED_RESPONSE);
    return;
  }

  // 4. Check the account is still active
  if (!admin.isActive) {
    res.status(401).json(UNAUTHORIZED_RESPONSE);
    return;
  }

  // 5. Attach full admin document (with convenience alias) to request
  req.admin = {
    ...admin,
    adminId: admin.id,
  };

  next();
};
