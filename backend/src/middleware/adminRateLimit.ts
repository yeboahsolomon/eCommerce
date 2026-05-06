import rateLimit from 'express-rate-limit';

// ─────────────────────────────────────────────────────────────
// Admin-Specific Rate Limiters
// ─────────────────────────────────────────────────────────────
//
// Completely independent from the storefront limiters in
// `rate-limit.middleware.ts`. These only apply to /api/admin/*.
// ─────────────────────────────────────────────────────────────

/**
 * Rate limiter for the admin login endpoint.
 *
 * **10 requests per 15 minutes per IP.**
 *
 * This is the strictest admin limiter to protect against
 * brute-force credential attacks on the admin portal.
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many requests',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use X-Forwarded-For when behind a reverse proxy, fall back to socket IP
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  },
});

/**
 * General rate limiter for all admin API endpoints.
 *
 * **200 requests per 15 minutes per IP.**
 *
 * Provides a safety net against automated abuse of authenticated
 * admin routes without impacting normal admin workflows.
 */
export const adminGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    error: 'Too many requests',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  },
});
