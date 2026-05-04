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
    const adminId = (req as any).admin?.adminId || (req as any).user?.id || 'unknown';
    const adminEmail = (req as any).admin?.email || (req as any).user?.email || 'unknown';
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

  const mappedLogs = logs.map(log => ({
    id: log.id,
    adminEmail: log.adminEmail,
    action: log.action,
    entityType: log.targetCollection,
    entityId: log.targetId,
    details: log.metadata,
    ipAddress: log.ip,
    createdAt: log.timestamp,
  }));

  return {
    logs: mappedLogs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Query security logs (login attempts)
 */
export async function getSecurityLogs(params: {
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = params;

  const [logs, total] = await Promise.all([
    prisma.securityLog.findMany({
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.securityLog.count(),
  ]);

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const attemptsCount = await prisma.securityLog.groupBy({
    by: ['ipAddress'],
    where: {
      status: 'FAILED',
      timestamp: { gte: last24h }
    },
    _count: {
      id: true
    }
  });

  const attemptsMap = new Map(attemptsCount.map(item => [item.ipAddress, item._count.id]));

  const mappedLogs = logs.map(log => ({
    id: log.id,
    ip: log.ipAddress,
    email: log.email,
    timestamp: log.timestamp,
    status: log.status === 'BLOCKED' ? 'Blocked' : (log.status === 'SUCCESS' ? 'Success' : 'Failed'),
    attempts: attemptsMap.get(log.ipAddress) || 0
  }));

  return {
    logs: mappedLogs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
