import { Router, Request, Response } from 'express';
import prisma from '../../config/database.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin.id;
    const admin = await prisma.superAdmin.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true, lastLoginAt: true }
    });
    
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    console.error('[Admin Settings] Fetch Profile Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin.id;
    const { name, email, phone, currentPassword, newPassword } = req.body;

    const admin = await prisma.superAdmin.findUnique({ where: { id: adminId } });
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });

    let updateData: any = { name, email, phone };

    if (currentPassword && newPassword) {
      const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid current password' });
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedAdmin = await prisma.superAdmin.update({
      where: { id: adminId },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true }
    });

    res.status(200).json({ success: true, data: updatedAdmin });
  } catch (error) {
    console.error('[Admin Settings] Update Profile Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Config
router.get('/config', async (req: Request, res: Response) => {
  try {
    let config = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
    
    // Auto-create if it doesn't exist
    if (!config) {
      config = await prisma.platformSettings.create({
        data: { id: 'global' }
      });
    }

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('[Admin Settings] Fetch Config Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch config' });
  }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin.id;
    const { commissionRate, maintenanceMode, autoApproveSellers, maxProductsPerSeller, payoutProcessingDays } = req.body;

    const config = await prisma.platformSettings.upsert({
      where: { id: 'global' },
      update: {
        commissionRate: parseFloat(commissionRate),
        maintenanceMode,
        autoApproveSellers,
        maxProductsPerSeller: parseInt(maxProductsPerSeller, 10),
        payoutProcessingDays: parseInt(payoutProcessingDays, 10),
        updatedBy: adminId
      },
      create: {
        id: 'global',
        commissionRate: parseFloat(commissionRate),
        maintenanceMode,
        autoApproveSellers,
        maxProductsPerSeller: parseInt(maxProductsPerSeller, 10),
        payoutProcessingDays: parseInt(payoutProcessingDays, 10),
        updatedBy: adminId
      }
    });

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('[Admin Settings] Update Config Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update config' });
  }
});

// Sessions
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin.id;
    
    // Fetch sessions from the tracking table
    const sessions = await prisma.adminSession.findMany({
      where: { adminId },
      orderBy: { lastSeenAt: 'desc' }
    });

    // If none exist (since JWT doesn't insert them yet), mock current session
    if (sessions.length === 0) {
      return res.status(200).json({
        success: true,
        data: [
          {
            id: 'current-jwt',
            device: 'Current Device',
            browser: 'Chrome / Web',
            os: 'Windows 11',
            ipAddress: req.ip || '127.0.0.1',
            lastSeenAt: new Date().toISOString(),
            status: 'ACTIVE'
          }
        ]
      });
    }

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('[Admin Settings] Fetch Sessions Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

export default router;
