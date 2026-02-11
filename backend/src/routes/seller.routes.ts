import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createSellerProfileSchema, updateSellerProfileSchema, CreateSellerProfileInput, UpdateSellerProfileInput } from '../utils/validators.js';
import { SellerService } from '../services/seller.service.js';

const router = Router();
const sellerService = new SellerService();

/**
 * POST /api/seller/onboard
 * Convert current user to a SELLER with a profile
 */
router.post(
  '/onboard',
  authenticate,
  validate(createSellerProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as CreateSellerProfileInput;
      // User ID from token
      const profile = await sellerService.createProfile(req.user!.id, data);
      
      res.status(201).json({
        success: true,
        message: 'Seller profile created successfully! You are now a seller.',
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/seller/approve/:sellerId
 * Approve a seller profile (Admin only)
 */
router.post(
  '/approve/:sellerId',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sellerId } = req.params;
      const profile = await sellerService.approveProfile(sellerId);
      res.json({ success: true, message: 'Seller approved.', data: { profile } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/seller/me
 * Get current user's seller profile
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await sellerService.getProfileByUserId(req.user!.id);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Seller profile not found.',
        });
      }
      
      res.json({
        success: true,
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/seller/me
 * Update seller profile
 */
router.put(
  '/me',
  authenticate,
  validate(updateSellerProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as UpdateSellerProfileInput;
      const profile = await sellerService.updateProfile(req.user!.id, data);
      
      res.json({
        success: true,
        message: 'Profile updated.',
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/seller/stats
 * Get seller dashboard stats
 */
router.get(
  '/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await sellerService.getDashboardStats(req.user!.id);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/seller/orders
 * Get seller orders
 */
router.get(
  '/orders',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      
      const result = await sellerService.getSellerOrders(req.user!.id, page, limit, status);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/seller/orders/:id/status
 * Update seller order status
 */
router.patch(
  '/orders/:id/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const order = await sellerService.updateOrderStatus(req.user!.id, id, status);
      res.json({ success: true, message: 'Order status updated', data: { order } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/seller/:slug
 * Public seller profile view
 */
router.get(
  '/:slug',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const profile = await sellerService.getProfileBySlug(slug);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Seller not found.',
        });
      }
      
      res.json({
        success: true,
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
