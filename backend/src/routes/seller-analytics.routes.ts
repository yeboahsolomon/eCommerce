import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireSellerOrAdmin } from '../middleware/auth.middleware.js';
import { validateQuery } from '../middleware/validate.middleware.js';
import { SellerAnalyticsService } from '../services/seller-analytics.service.js';

const router = Router();
const analyticsService = new SellerAnalyticsService();

// ==================== QUERY VALIDATION ====================

/**
 * Zod schema for analytics date-range query parameters.
 * Defaults: last 30 days.
 */
const analyticsQuerySchema = z.object({
  start_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'start_date must be a valid ISO date string' })
    .optional(),
  end_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'end_date must be a valid ISO date string' })
    .optional(),
});

const bestSellersQuerySchema = analyticsQuerySchema.extend({
  limit: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0 && Number(val) <= 50, {
      message: 'limit must be a number between 1 and 50',
    })
    .optional(),
});

// ==================== HELPERS ====================

/**
 * Parse date range from query params, defaulting to the last 30 days.
 */
function parseDateRange(query: { start_date?: string; end_date?: string }): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = query.end_date ? new Date(query.end_date) : new Date();
  const startDate = query.start_date
    ? new Date(query.start_date)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  // Ensure endDate covers the full day
  endDate.setHours(23, 59, 59, 999);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}

// ==================== ROUTES ====================

/**
 * GET /api/seller/analytics/sales
 * Total sales amount for the authenticated seller.
 *
 * Query: ?start_date=2026-01-01&end_date=2026-01-31
 *
 * Sample response:
 * {
 *   "success": true,
 *   "data": {
 *     "currency": "GHS",
 *     "totalSales": 12450.50,
 *     "totalOrders": 87,
 *     "averageOrderValue": 143.11,
 *     "period": { "startDate": "...", "endDate": "..." }
 *   }
 * }
 */
router.get(
  '/sales',
  authenticate,
  requireSellerOrAdmin,
  validateQuery(analyticsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(req.query as { start_date?: string; end_date?: string });
      const data = await analyticsService.getSalesAnalytics(req.user!.id, range);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/seller/analytics/orders
 * Order count with status breakdown.
 *
 * Query: ?start_date=2026-01-01&end_date=2026-01-31
 *
 * Sample response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalOrders": 87,
 *     "statusBreakdown": {
 *       "pending": 5,
 *       "processing": 12,
 *       "shipped": 20,
 *       "delivered": 45,
 *       "cancelled": 3,
 *       "refunded": 2
 *     },
 *     "period": { "startDate": "...", "endDate": "..." }
 *   }
 * }
 */
router.get(
  '/orders',
  authenticate,
  requireSellerOrAdmin,
  validateQuery(analyticsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(req.query as { start_date?: string; end_date?: string });
      const data = await analyticsService.getOrdersAnalytics(req.user!.id, range);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/seller/analytics/revenue
 * Revenue with automatic period comparison.
 *
 * Query: ?start_date=2026-01-01&end_date=2026-01-31
 *
 * Sample response:
 * {
 *   "success": true,
 *   "data": {
 *     "currency": "GHS",
 *     "totalRevenue": 11500.75,
 *     "previousPeriodRevenue": 9800.00,
 *     "percentageChange": 17.35,
 *     "trend": "up",
 *     "period": { "startDate": "...", "endDate": "..." },
 *     "previousPeriod": { "startDate": "...", "endDate": "..." }
 *   }
 * }
 */
router.get(
  '/revenue',
  authenticate,
  requireSellerOrAdmin,
  validateQuery(analyticsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(req.query as { start_date?: string; end_date?: string });
      const data = await analyticsService.getRevenueAnalytics(req.user!.id, range);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/seller/analytics/best-sellers
 * Top-performing products by units sold.
 *
 * Query: ?start_date=2026-01-01&end_date=2026-01-31&limit=10
 *
 * Sample response:
 * {
 *   "success": true,
 *   "data": {
 *     "currency": "GHS",
 *     "bestSellers": [
 *       {
 *         "productId": "clxyz...",
 *         "productName": "iPhone 15 Pro",
 *         "productImage": "/uploads/iphone.jpg",
 *         "unitsSold": 42,
 *         "revenue": 6300.00,
 *         "trend": "up"
 *       }
 *     ],
 *     "period": { "startDate": "...", "endDate": "..." }
 *   }
 * }
 */
router.get(
  '/best-sellers',
  authenticate,
  requireSellerOrAdmin,
  validateQuery(bestSellersQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(req.query as { start_date?: string; end_date?: string });
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const data = await analyticsService.getBestSellers(req.user!.id, range, limit);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
