import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';

/**
 * Higher-order middleware to log admin actions.
 * @param action The action being performed (e.g., 'BAN_USER', 'DELETE_PRODUCT')
 * @param targetCollection The entity type being acted upon (e.g., 'user', 'product')
 * @param paramKeyForTargetId The key in req.params where the target ID can be found
 */
export const logAdminAction = (action: string, targetCollection: string, paramKeyForTargetId: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // We want to log the action ONLY if the request succeeds.
    // So we hook into the 'finish' event of the response.
    res.on('finish', async () => {
      // If the status code indicates success (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const adminId = req.user?.id;
          const adminEmail = req.user?.email;
          const targetId = req.params[paramKeyForTargetId];

          if (!adminId || !adminEmail || !targetId) {
            console.error('[AdminLog] Missing required fields for logging:', { adminId, targetId });
            return;
          }

          const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

          await prisma.adminLog.create({
            data: {
              adminId,
              adminEmail,
              action,
              targetCollection,
              targetId,
              metadata: {
                method: req.method,
                url: req.originalUrl,
                body: req.body, // Be careful not to log passwords if any
              },
              ip: typeof ip === 'string' ? ip : undefined,
            },
          });
        } catch (error) {
          console.error('[AdminLog] Error saving admin log:', error);
        }
      }
    });

    next();
  };
};
