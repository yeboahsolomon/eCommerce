import { Router, Request, Response } from 'express';
import prisma from '../../config/database.js';

const router = Router();

// ==========================================
// ORDER DISPUTES
// ==========================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        order: { select: { orderNumber: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
        seller: { select: { businessName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedDisputes = disputes.map((d: any) => ({
      id: d.id,
      orderNumber: d.order.orderNumber,
      customerName: `${d.user.firstName} ${d.user.lastName}`,
      sellerName: d.seller.businessName,
      reason: d.reason,
      status: d.status,
      date: d.createdAt.toISOString()
    }));

    res.status(200).json({ success: true, data: formattedDisputes });
  } catch (error) {
    console.error('[Admin Disputes] Fetch Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch disputes' });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const dispute = await prisma.dispute.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({ success: true, data: dispute });
  } catch (error) {
    console.error('[Admin Disputes] Update Status Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update dispute status' });
  }
});

// ==========================================
// FLAGGED PRODUCTS
// ==========================================

router.get('/flagged-products', async (req: Request, res: Response) => {
  try {
    const flagged = await prisma.flaggedProduct.findMany({
      include: {
        product: { select: { name: true, seller: { select: { businessName: true } } } },
        user: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedFlagged = flagged.map((f: any) => ({
      id: f.id,
      productName: f.product.name,
      sellerName: f.product.seller?.businessName || 'Unknown Seller',
      reportedBy: f.user ? `${f.user.firstName} ${f.user.lastName}` : 'Anonymous',
      reason: f.reason,
      status: f.status,
      date: f.createdAt.toISOString()
    }));

    res.status(200).json({ success: true, data: formattedFlagged });
  } catch (error) {
    console.error('[Admin Disputes] Fetch Flagged Products Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch flagged products' });
  }
});

router.put('/flagged-products/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const flagged = await prisma.flaggedProduct.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({ success: true, data: flagged });
  } catch (error) {
    console.error('[Admin Disputes] Update Flagged Product Status Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update flagged product status' });
  }
});

export default router;
