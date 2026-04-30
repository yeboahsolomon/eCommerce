import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware.js';
import { getActivityLogs, getSecurityLogs } from '../services/admin-activity.service.js';

const router = Router();

// Secure all audit routes
router.use(authMiddleware);
router.use(requireAdmin);

// ==================== ADMIN ACTIVITY LOGS ====================

// Fetch paginated admin audit logs
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const entityType = req.query.entityType as string;
    const action = req.query.action as string;

    const data = await getActivityLogs({
      entityType,
      action,
      page,
      limit,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Get admin audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin audit logs' });
  }
});

// ==================== SECURITY LOGS (FAILED LOGINS) ====================

// Fetch paginated security logs (login attempts)
router.get('/security-logs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const data = await getSecurityLogs({
      page,
      limit,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Get security logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch security logs' });
  }
});

// ==================== INVENTORY AUDIT LOGS ====================

// Fetch paginated inventory logs
router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const productId = req.query.productId as string;
    const action = req.query.action as string;

    const where: any = {};
    if (productId) where.productId = productId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get inventory logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory logs' });
  }
});

export default router;
