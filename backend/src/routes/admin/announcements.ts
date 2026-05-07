import { Router, Request, Response } from 'express';
import prisma from '../../config/database.js';

const router = Router();

// GET all announcements
router.get('/', async (req: Request, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const formattedAnnouncements = announcements.map((a: any) => ({
      id: a.id,
      title: a.title,
      message: a.content,
      target: a.targetRole,
      status: a.isActive ? 'ACTIVE' : 'INACTIVE',
      date: a.createdAt.toISOString(),
      expiresAt: a.expiresAt ? a.expiresAt.toISOString() : undefined
    }));

    res.status(200).json({ success: true, data: formattedAnnouncements });
  } catch (error) {
    console.error('[Admin Announcements] Fetch Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch announcements' });
  }
});

// POST new announcement
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, message, target, expiresAt, status } = req.body;
    const adminId = (req as any).admin.id;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content: message,
        targetRole: target || 'ALL',
        isActive: status === 'ACTIVE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        authorId: adminId
      }
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    console.error('[Admin Announcements] Create Error:', error);
    res.status(500).json({ success: false, error: 'Failed to create announcement' });
  }
});

// PUT update announcement
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, message, target, expiresAt, status } = req.body;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title,
        content: message,
        targetRole: target,
        isActive: status === 'ACTIVE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    });

    res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    console.error('[Admin Announcements] Update Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update announcement' });
  }
});

// DELETE announcement
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({
      where: { id }
    });

    res.status(200).json({ success: true, data: null });
  } catch (error) {
    console.error('[Admin Announcements] Delete Error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete announcement' });
  }
});

export default router;
