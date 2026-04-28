import prisma from '../config/database.js';
import { Request } from 'express';

// ============================================================
// Admin Activity Logging Service
// Logs all admin actions for audit trail and accountability
// ============================================================

export type AdminAction =
  | 'VIEW_APPLICATION'
  | 'APPROVE_APPLICATION'
  | 'REJECT_APPLICATION'
  | 'REQUEST_INFO'
  | 'UPDATE_APPLICATION_NOTES'
  | 'SUSPEND_SELLER'
  | 'ACTIVATE_SELLER'
  | 'UPDATE_COMMISSION_RATE'
  | 'SUSPEND_USER'
  | 'ACTIVATE_USER'
  | 'DEACTIVATE_USER'
  | 'DELETE_USER'
  | 'UPDATE_ORDER_STATUS'
  | 'UPDATE_INVENTORY'
  | 'BULK_APPROVE_APPLICATIONS'
  | 'BULK_REJECT_APPLICATIONS';

export type EntityType =
  | 'seller_application'
  | 'seller'
  | 'user'
  | 'order'
  | 'product';

interface LogActivityParams {
  req: Request;
  action: AdminAction;
  entityType: EntityType;
  entityId: string;
  details?: Record<string, any>;
}

/**
 * Log an admin action to the activity log.
 * Non-blocking — errors are caught and logged to console.
 */
export async function logAdminActivity({
  req,
  action,
  entityType,
  entityId,
  details,
}: LogActivityParams): Promise<void> {
  try {
    const adminId = (req as any).user?.id || 'unknown';
    const adminEmail = (req as any).user?.email || 'unknown';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    await prisma.adminLog.create({
      data: {
        adminId,
        adminEmail,
        action,
        targetCollection: entityType,
        targetId: entityId,
        metadata: details || undefined,
        ip: ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to log admin activity:', error);
    // Non-blocking — don't throw
  }
}

/**
 * Query activity logs with filters and pagination.
 */
export async function getActivityLogs(params: {
  entityType?: string;
  entityId?: string;
  adminId?: string;
  action?: string;
  page?: number;
  limit?: number;
}) {
  const { entityType, entityId, adminId, action, page = 1, limit = 20 } = params;

  const where: any = {};
  if (entityType) where.targetCollection = entityType;
  if (entityId) where.targetId = entityId;
  if (adminId) where.adminId = adminId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
