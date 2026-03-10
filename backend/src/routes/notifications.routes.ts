import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// ==================== ROUTES ====================

// Get user's notifications
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause: any = { userId };
    
    if (unreadOnly === 'true') {
        whereClause.read = false;
    }

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNumber,
        }),
        prisma.notification.count({ where: whereClause })
    ]);

    const unreadCount = await prisma.notification.count({
        where: { userId, read: false }
    });

    res.json({
        success: true,
        data: {
            notifications,
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                pages: Math.ceil(total / limitNumber),
            },
            unreadCount
        }
    });
  } catch (error: any) {
      console.error('Get notifications error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark a single notification as read
router.put('/:id/read', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        // Ensure ownership
        const notification = await prisma.notification.findUnique({ where: { id } });
        
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        
        if (notification.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to notification' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { read: true }
        });

        res.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ success: false, message: 'Failed to update notification' });
    }
});

// Mark all as read
router.put('/mark-all-read', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true } // Mark all unread as read
        });

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ success: false, message: 'Failed to update notifications' });
    }
});

export default router;
