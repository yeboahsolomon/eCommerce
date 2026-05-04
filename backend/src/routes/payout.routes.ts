import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware, requireSellerOrAdmin } from '../middleware/auth.middleware.js';
import { requireSuperAdmin } from '../middleware/admin-auth.middleware.js';
import { paystackService } from '../services/paystack.service.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// ==================== VALIDATION ====================

const requestPayoutSchema = z.object({
  amount: z.number().min(5000, 'Minimum payout is ₵50 (5000 pesewas)'),
  mobileMoneyNumber: z.string().regex(/^0\d{9}$/, 'Invalid Ghana phone number'),
  mobileMoneyProvider: z.enum(['MTN', 'TELECEL', 'AIRTELTIGO']),
  mobileMoneyName: z.string().min(2, 'Account holder name required'),
});

// ==================== SELLER: REQUEST PAYOUT ====================

router.post(
  '/request',
  authMiddleware,
  requireSellerOrAdmin,
  validate(requestPayoutSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { amount, mobileMoneyNumber, mobileMoneyProvider, mobileMoneyName } = req.body;

      // Get seller profile and wallet
      const seller = await prisma.sellerProfile.findFirst({
        where: { userId },
        include: { wallet: true },
      });

      if (!seller || !seller.wallet) {
        return res.status(404).json({ success: false, message: 'Seller profile or wallet not found' });
      }

      // Check available balance
      if (seller.wallet.currentBalance < amount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Available: ₵${(seller.wallet.currentBalance / 100).toFixed(2)}`,
        });
      }

      // Check for pending payouts
      const pendingPayout = await prisma.payout.findFirst({
        where: { sellerId: seller.id, status: { in: ['PENDING', 'PROCESSING'] } },
      });

      if (pendingPayout) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending payout request. Please wait for it to be processed.',
        });
      }

      // Create payout request
      const payout = await prisma.payout.create({
        data: {
          sellerId: seller.id,
          amount, // In pesewas
          status: 'PENDING',
          destinationType: 'MOMO',
          destinationNumber: mobileMoneyNumber,
          destinationNetwork: mobileMoneyProvider,
          destinationName: mobileMoneyName,
        },
      });

      res.json({
        success: true,
        message: 'Payout request submitted. Admin will review and approve.',
        data: {
          payoutId: payout.id,
          amount: amount / 100,
          destination: `${paystackService.getProviderDisplayName(mobileMoneyProvider)} - ${mobileMoneyNumber}`,
          status: payout.status,
        },
      });
    } catch (error: any) {
      console.error('Payout request error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit payout request' });
    }
  }
);

// ==================== SELLER: PAYOUT HISTORY ====================

router.get('/', authMiddleware, requireSellerOrAdmin, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const status = req.query.status as string;

    const seller = await prisma.sellerProfile.findFirst({
      where: { userId },
      include: { wallet: true },
    });

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found' });
    }

    const where: any = { sellerId: seller.id };
    if (status) where.status = status.toUpperCase();

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.payout.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        wallet: {
          currentBalance: (seller.wallet?.currentBalance || 0) / 100,
          pendingBalance: (seller.wallet?.pendingBalance || 0) / 100,
          totalEarned: (seller.wallet?.totalEarned || 0) / 100,
          totalWithdrawn: (seller.wallet?.totalWithdrawn || 0) / 100,
        },
        payouts: payouts.map((p) => ({
          id: p.id,
          amount: p.amount / 100,
          status: p.status,
          destinationType: p.destinationType,
          destinationNumber: p.destinationNumber,
          destinationNetwork: p.destinationNetwork,
          destinationName: p.destinationName,
          processedAt: p.processedAt,
          notes: p.notes,
          createdAt: p.createdAt,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payouts' });
  }
});

// ==================== ADMIN: LIST ALL PAYOUTS ====================

router.get('/admin/all', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status.toUpperCase();

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        include: {
          seller: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.payout.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        payouts: payouts.map((p) => ({
          id: p.id,
          amount: p.amount / 100,
          status: p.status,
          sellerName: `${p.seller.user.firstName} ${p.seller.user.lastName}`,
          sellerEmail: p.seller.user.email,
          businessName: p.seller.businessName,
          destinationType: p.destinationType,
          destinationNumber: p.destinationNumber,
          destinationNetwork: p.destinationNetwork,
          destinationName: p.destinationName,
          transactionReference: p.transactionReference,
          processedAt: p.processedAt,
          notes: p.notes,
          createdAt: p.createdAt,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payouts' });
  }
});

// ==================== ADMIN: APPROVE PAYOUT ====================

router.post('/:id/approve', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.admin?.adminId;

    const payout = await prisma.payout.findUnique({
      where: { id },
      include: {
        seller: {
          include: {
            wallet: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    if (payout.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Payout is already ${payout.status.toLowerCase()}` });
    }

    const wallet = payout.seller?.wallet;
    if (!wallet || wallet.currentBalance < payout.amount) {
      return res.status(400).json({ success: false, message: 'Insufficient seller balance' });
    }

    // Step 1: Create Paystack transfer recipient
    const bankCode = paystackService.getMomoProviderCode(payout.destinationNetwork || 'MTN');
    const recipient = await paystackService.createTransferRecipient({
      name: payout.destinationName || `${payout.seller.user.firstName} ${payout.seller.user.lastName}`,
      accountNumber: payout.destinationNumber || '',
      bankCode,
      type: 'mobile_money',
    });

    // Step 2: Initiate the transfer
    const transfer = await paystackService.initiateTransfer({
      amountInPesewas: payout.amount,
      recipientCode: recipient.recipientCode,
      reason: `GhanaMarket seller payout for ${payout.seller.businessName}`,
    });

    // Step 3: Debit wallet and update payout
    await prisma.$transaction([
      prisma.payout.update({
        where: { id },
        data: {
          status: 'PROCESSING',
          transactionReference: transfer.transferCode,
          processedAt: new Date(),
        },
      }),
      prisma.sellerWallet.update({
        where: { id: wallet.id },
        data: {
          currentBalance: { decrement: payout.amount },
          totalWithdrawn: { increment: payout.amount },
        },
      }),
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYOUT',
          amount: -payout.amount, // Negative = debit
          balanceBefore: wallet.currentBalance,
          balanceAfter: wallet.currentBalance - payout.amount,
          description: `Payout to ${payout.destinationNetwork} ${payout.destinationNumber}`,
          referenceId: payout.id,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Payout approved and transfer initiated',
      data: {
        payoutId: payout.id,
        transferCode: transfer.transferCode,
        status: 'PROCESSING',
      },
    });
  } catch (error: any) {
    console.error('Payout approval error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process payout' });
  }
});

// ==================== ADMIN: CANCEL PAYOUT ====================

router.post('/:id/cancel', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payout = await prisma.payout.findUnique({ where: { id } });

    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    if (!['PENDING', 'PROCESSING'].includes(payout.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${payout.status.toLowerCase()} payout` });
    }

    await prisma.payout.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason || 'Cancelled by admin',
      },
    });

    res.json({ success: true, message: 'Payout cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel payout' });
  }
});

export default router;
