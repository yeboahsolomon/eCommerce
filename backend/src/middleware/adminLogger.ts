import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';

// ─────────────────────────────────────────────────────────────
// Admin Action Logger
// ─────────────────────────────────────────────────────────────
//
// Two entry-points:
//   • `logAdminAction(action, targetCollection, paramKey)` — Express middleware (HOF)
//   • `logAction(req, action, targetCollection, targetId, metadata?)` — fire-and-forget utility
//
// Both write to the `AdminLog` table and **never** throw.
// ─────────────────────────────────────────────────────────────

/**
 * Higher-order Express middleware that logs an admin action **after**
 * the response completes successfully (2xx status).
 *
 * @param action           Human-readable action name, e.g. `"BANNED_USER"`
 * @param targetCollection The entity collection acted upon, e.g. `"User"`
 * @param paramKeyForTargetId  Key in `req.params` holding the target ID
 *
 * @example
 * ```ts
 * router.put(
 *   '/users/:userId/status',
 *   logAdminAction('UPDATE_USER_STATUS', 'User', 'userId'),
 *   handler,
 * );
 * ```
 */
export const logAdminAction = (
  action: string,
  targetCollection: string,
  paramKeyForTargetId: string
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    _res.on('finish', () => {
      // Only log on success responses
      if (_res.statusCode >= 200 && _res.statusCode < 300) {
        try {
          const adminId = req.admin?.adminId ?? req.admin?.id;
          const adminEmail = req.admin?.email;
          const targetId = req.params[paramKeyForTargetId];

          if (!adminId || !adminEmail || !targetId) {
            console.error('[AdminLogger] Missing required fields:', {
              adminId,
              adminEmail,
              targetId,
            });
            return;
          }

          const ipAddress =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            'unknown';

          const userAgent = req.headers['user-agent'] || 'unknown';

          // Fire-and-forget — do NOT await at the call-site
          prisma.adminLog
            .create({
              data: {
                adminId,
                adminEmail,
                action,
                targetCollection,
                targetId,
                metadata: {
                  method: req.method,
                  url: req.originalUrl,
                  body: sanitiseBody(req.body) as any,
                },
                ip: ipAddress,
                userAgent,
              },
            })
            .catch((err) => {
              console.error('[AdminLogger] Failed to save log entry:', err);
            });
        } catch (err) {
          console.error('[AdminLogger] Unexpected error in log handler:', err);
        }
      }
    });

    next();
  };
};

/**
 * Standalone utility to log an admin action. Call this anywhere
 * inside a route handler or service layer.
 *
 * **Non-blocking** — the returned promise resolves immediately;
 * the database write happens asynchronously. The function never
 * throws regardless of database errors.
 *
 * @param req              The Express request (must have `req.admin` set)
 * @param action           Action name, e.g. `"APPROVED_SELLER"`
 * @param targetCollection Collection acted upon, e.g. `"SellerApplication"`
 * @param targetId         The ID of the target entity
 * @param metadata         Optional additional context to store
 *
 * @example
 * ```ts
 * logAction(req, 'APPROVED_SELLER', 'SellerApplication', id, { reason });
 * ```
 */
export function logAction(
  req: Request,
  action: string,
  targetCollection: string,
  targetId: string,
  metadata?: Record<string, unknown>
): void {
  try {
    const adminId = req.admin?.adminId ?? req.admin?.id ?? 'unknown';
    const adminEmail = req.admin?.email ?? 'unknown';

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    // Asynchronous — not awaited, not blocking
    prisma.adminLog
      .create({
        data: {
          adminId,
          adminEmail,
          action,
          targetCollection,
          targetId,
          metadata: metadata ? (metadata as any) : undefined,
          ip: ipAddress,
          userAgent,
        },
      })
      .catch((err) => {
        console.error('[AdminLogger] logAction failed:', err);
      });
  } catch (err) {
    console.error('[AdminLogger] logAction unexpected error:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Strip sensitive fields from the request body before persisting to logs.
 * @internal
 */
function sanitiseBody(body: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return body;

  const SENSITIVE_KEYS = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'passwordHash',
    'token',
    'secret',
  ]);

  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    cleaned[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : value;
  }

  return cleaned;
}
