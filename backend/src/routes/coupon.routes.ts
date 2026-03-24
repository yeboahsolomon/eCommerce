import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { z } from 'zod';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createCouponSchema = z.object({
  code: z.string().min(3).max(30).transform((v) => v.toUpperCase().trim()),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().int().positive(),
  minOrderInPesewas: z.number().int().min(0).optional().default(0),
  maxDiscountInPesewas: z.number().int().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional().default(true),
  sellerId: z.string().optional(),
});

const updateCouponSchema = z.object({
  code: z.string().min(3).max(30).transform((v) => v.toUpperCase().trim()).optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().int().positive().optional(),
  minOrderInPesewas: z.number().int().min(0).optional(),
  maxDiscountInPesewas: z.number().int().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

// ==================== ROUTES ====================

/**
 * GET /api/admin/coupons
 * List all coupons (paginated)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const search = req.query.search as string;
      const status = req.query.status as string; // 'active', 'expired', 'all'

      const where: any = {};

      if (search) {
        where.code = { contains: search, mode: 'insensitive' };
      }

      if (status === 'active') {
        where.isActive = true;
        where.OR = [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ];
      } else if (status === 'expired') {
        where.OR = [
          { isActive: false },
          { expiresAt: { lt: new Date() } },
        ];
      }

      const [coupons, total] = await Promise.all([
        prisma.coupon.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.coupon.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          coupons,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/coupons
 * Create a new coupon
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createCouponSchema.parse(req.body);

      // Check for duplicate code
      const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
      if (existing) {
        throw new ApiError(409, `Coupon code "${data.code}" already exists.`);
      }

      const coupon = await prisma.coupon.create({
        data: {
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          minOrderInPesewas: data.minOrderInPesewas,
          maxDiscountInPesewas: data.maxDiscountInPesewas,
          usageLimit: data.usageLimit,
          startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          isActive: data.isActive,
          sellerId: data.sellerId || null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Coupon created successfully.',
        data: { coupon },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues,
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/admin/coupons/:id
 * Get single coupon details
 */
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coupon = await prisma.coupon.findUnique({
        where: { id: req.params.id },
        include: { seller: { select: { businessName: true, slug: true } } },
      });

      if (!coupon) {
        throw new ApiError(404, 'Coupon not found.');
      }

      res.json({ success: true, data: { coupon } });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/coupons/:id
 * Update a coupon
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateCouponSchema.parse(req.body);

      const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        throw new ApiError(404, 'Coupon not found.');
      }

      // If changing code, check uniqueness
      if (data.code && data.code !== existing.code) {
        const duplicate = await prisma.coupon.findUnique({ where: { code: data.code } });
        if (duplicate) {
          throw new ApiError(409, `Coupon code "${data.code}" already exists.`);
        }
      }

      const updateData: any = { ...data };
      if (data.startsAt) updateData.startsAt = new Date(data.startsAt);
      if (data.expiresAt) updateData.expiresAt = new Date(data.expiresAt);

      const coupon = await prisma.coupon.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Coupon updated.',
        data: { coupon },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues,
        });
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/coupons/:id
 * Deactivate a coupon (soft delete)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        throw new ApiError(404, 'Coupon not found.');
      }

      await prisma.coupon.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'Coupon deactivated.',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
