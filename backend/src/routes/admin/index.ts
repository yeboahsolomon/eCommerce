import { Router, Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../middleware/admin-auth.middleware.js';
import { adminLoginLimiter, adminGeneralLimiter } from '../../middleware/adminRateLimit.js';

// ─────────────────────────────────────────────────────────────
// Sub-router imports
// ─────────────────────────────────────────────────────────────

import adminAuthRoutes from '../admin-auth.routes.js';
import adminCoreRoutes from '../admin.routes.js';
import adminAuditRoutes from '../admin-audit.routes.js';
import couponRoutes from '../coupon.routes.js';

// ─────────────────────────────────────────────────────────────
// Centralised Admin Router
// ─────────────────────────────────────────────────────────────
//
// All admin routes live under /api/admin/* and are mounted
// through this single entry-point in server.ts.
//
// Route structure:
//   /api/admin/auth         → login, logout, me, change-password
//   /api/admin/dashboard    → dashboard overview stats
//   /api/admin/sellers      → seller management
//   /api/admin/applications → seller applications (aliased from seller-applications)
//   /api/admin/orders       → order management
//   /api/admin/products     → product management (inventory)
//   /api/admin/users        → user management
//   /api/admin/transactions → (future: payment logs)
//   /api/admin/disputes     → (future: disputes)
//   /api/admin/announcements→ (future: announcements)
//   /api/admin/audit-logs   → audit log viewer
//   /api/admin/settings     → (future: platform settings)
//   /api/admin/sessions     → (future: active sessions)
//   /api/admin/coupons      → coupon management
// ─────────────────────────────────────────────────────────────

const adminRouter = Router();

/**
 * Apply the general admin rate limiter to every admin route.
 * This caps all admin endpoints at 200 requests / 15 min / IP.
 */
adminRouter.use(adminGeneralLimiter);

// ─────────────────────────────────────────────────────────────
// AUTH — public (login) + protected (me, logout, change-password)
// ─────────────────────────────────────────────────────────────

// Login gets its own stricter rate limiter and does NOT require
// the admin auth middleware (the user isn't authenticated yet).
adminRouter.post('/auth/login', adminLoginLimiter, (req: Request, res: Response, next: NextFunction) => {
  // Forward to the auth sub-router's POST /login handler
  req.url = '/login';
  adminAuthRoutes(req, res, next);
});

// All other /auth/* routes require authentication
adminRouter.use('/auth', requireSuperAdmin, adminAuthRoutes);

// ─────────────────────────────────────────────────────────────
// PROTECTED ROUTES — all require admin auth
// ─────────────────────────────────────────────────────────────

adminRouter.use(requireSuperAdmin);

// Dashboard & Analytics
adminRouter.use('/', adminCoreRoutes);

// Audit Logs
adminRouter.use('/audit-logs', adminAuditRoutes);

// Coupons
adminRouter.use('/coupons', couponRoutes);

// ─────────────────────────────────────────────────────────────
// Future route stubs — uncomment as features are built:
//
// adminRouter.use('/transactions', transactionRoutes);
// adminRouter.use('/disputes', disputeRoutes);
// adminRouter.use('/announcements', announcementRoutes);
// adminRouter.use('/settings', settingsRoutes);
// adminRouter.use('/sessions', sessionRoutes);
// ─────────────────────────────────────────────────────────────

export default adminRouter;
