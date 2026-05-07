import { Router, Request, Response } from 'express';
import prisma from '../../config/database.js';

const router = Router();

// GET /api/admin/transactions/summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const totalPaidOutQuery = await prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amountInPesewas: true },
    });

    const pendingSettlementsQuery = await prisma.payment.aggregate({
      where: { status: 'PENDING' },
      _sum: { amountInPesewas: true },
    });

    const failedCount = await prisma.payment.count({
      where: { status: 'FAILED' },
    });

    const totalCount = await prisma.payment.count();
    const successCount = await prisma.payment.count({
      where: { status: 'SUCCESS' },
    });

    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalPaidOutInPesewas: totalPaidOutQuery._sum.amountInPesewas || 0,
        pendingSettlementsInPesewas: pendingSettlementsQuery._sum.amountInPesewas || 0,
        failedTransactions: failedCount,
        successRate: parseFloat(successRate.toFixed(1)),
      },
    });
  } catch (error: any) {
    console.error('[Admin Transactions Summary] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction summary' });
  }
});

// GET /api/admin/transactions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, method, search } = req.query;

    const whereClause: any = {};

    if (status && status !== 'All') {
      whereClause.status = (status as String).toUpperCase();
    }

    if (method && method !== 'All') {
      // Map frontend method string to backend enum if needed, or search loosely
      if (method === 'Paystack') whereClause.method = 'CARD';
      if (method === 'MTN MoMo') whereClause.method = 'MOMO_MTN';
      if (method === 'Telecel Cash') whereClause.method = 'MOMO_VODAFONE';
      if (method === 'AirtelTigo') whereClause.method = 'MOMO_AIRTELTIGO';
    }

    if (search) {
      whereClause.OR = [
        { gatewayReference: { contains: search as string, mode: 'insensitive' } },
        { id: { contains: search as string, mode: 'insensitive' } },
        { order: { user: { firstName: { contains: search as string, mode: 'insensitive' } } } },
        { order: { user: { lastName: { contains: search as string, mode: 'insensitive' } } } },
      ];
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit for MVP
    });

    const formattedTransactions = payments.map((p: any) => {
      let mappedMethod = "Unknown";
      if (p.method === 'CARD') mappedMethod = "Paystack";
      else if (p.method === 'MOMO_MTN') mappedMethod = "MTN MoMo";
      else if (p.method === 'MOMO_VODAFONE') mappedMethod = "Telecel Cash";
      else if (p.method === 'MOMO_AIRTELTIGO') mappedMethod = "AirtelTigo";
      else mappedMethod = p.method;

      let mappedStatus = "Pending";
      if (p.status === 'SUCCESS') mappedStatus = "Success";
      else if (p.status === 'FAILED') mappedStatus = "Failed";

      return {
        id: p.id,
        referenceId: p.gatewayReference || p.id.slice(-8).toUpperCase(),
        customerName: p.order?.user ? `${p.order.user.firstName} ${p.order.user.lastName}` : "Unknown Customer",
        customerPhone: p.order?.customerPhone || "N/A",
        amount: p.amountInPesewas / 100,
        method: mappedMethod,
        status: mappedStatus,
        date: p.createdAt.toISOString(),
      };
    });

    res.status(200).json({
      success: true,
      data: formattedTransactions,
    });
  } catch (error: any) {
    console.error('[Admin Transactions] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

export default router;
