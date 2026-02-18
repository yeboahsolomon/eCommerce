import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin, requireSellerOrAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createSellerProfileSchema,
  updateSellerProfileSchema,
  sellerApplicationSchema,
  updateStoreSettingsSchema,
  CreateSellerProfileInput,
  UpdateSellerProfileInput,
  SellerApplicationInput,
  UpdateStoreSettingsInput,
} from '../utils/validators.js';
import { SellerService } from '../services/seller.service.js';
import { uploadSellerDocuments, handleUploadError, getSellerDocUrl } from '../middleware/multer.middleware.js';
import { applicationLimiter } from '../middleware/rate-limit.middleware.js';
import { emailService } from '../services/email.service.js';
import { config } from '../config/env.js';
import prisma from '../config/database.js';
import { ApiError } from '../middleware/error.middleware.js';

const router = Router();
const sellerService = new SellerService();

// ==================== SELLER APPLICATION ====================

/**
 * POST /api/seller/apply
 * Submit seller application (authenticated buyers only)
 */
router.post(
  '/apply',
  authenticate,
  applicationLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    uploadSellerDocuments(req, res, (err: any) => {
      if (err) return handleUploadError(err, req, res, next);
      next();
    });
  },
  validate(sellerApplicationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      // Only buyers can apply
      if (req.user!.role !== 'BUYER') {
        throw new ApiError(400, 'Only buyers can apply to become sellers. You are already a seller or admin.');
      }

      // Check for existing pending/info-requested application
      const existingApp = await prisma.sellerApplication.findFirst({
        where: {
          userId,
          status: { in: ['PENDING', 'INFO_REQUESTED'] },
        },
      });

      if (existingApp) {
        throw new ApiError(400, 'You already have an active application. Please wait for it to be reviewed.');
      }

      // Check store name uniqueness
      const storeTaken = await prisma.sellerApplication.findFirst({
        where: {
          storeName: req.body.storeName,
          status: { in: ['PENDING', 'APPROVED', 'INFO_REQUESTED'] },
        },
      });

      if (storeTaken) {
        throw new ApiError(400, 'This store name is already taken. Please choose another.');
      }

      // Also check against existing seller profiles
      const slug = req.body.storeName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const slugTaken = await prisma.sellerProfile.findUnique({
        where: { slug },
      });

      if (slugTaken) {
        throw new ApiError(400, 'A seller with a similar store name already exists. Please choose a different name.');
      }

      // Handle uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let ghanaCardImageUrl: string | undefined;
      let businessRegImageUrl: string | undefined;

      if (files?.ghanaCardImage?.[0]) {
        ghanaCardImageUrl = getSellerDocUrl(files.ghanaCardImage[0].filename, config.uploadsBaseUrl);
      }

      if (files?.businessRegImage?.[0]) {
        businessRegImageUrl = getSellerDocUrl(files.businessRegImage[0].filename, config.uploadsBaseUrl);
      }

      // Business type validation: require business registration for BUSINESS type
      if (req.body.businessType === 'BUSINESS' && !businessRegImageUrl) {
        throw new ApiError(400, 'Business registration document is required for business accounts.');
      }

      const data: SellerApplicationInput = req.body;

      // Create application
      const application = await prisma.sellerApplication.create({
        data: {
          userId,
          storeName: data.storeName,
          businessType: data.businessType as any,
          businessEmail: data.businessEmail,
          businessPhone: data.businessPhone,
          ghanaCardNumber: data.ghanaCardNumber,
          businessAddress: data.businessAddress,
          ghanaRegion: data.ghanaRegion,
          mobileMoneyNumber: data.mobileMoneyNumber,
          mobileMoneyProvider: data.mobileMoneyProvider as any,
          ghanaCardImageUrl,
          businessRegImageUrl,
        },
      });

      // Fetch user for email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });

      // Send emails (non-blocking)
      if (user) {
        emailService.sendApplicationReceivedEmail(
          user.email,
          user.firstName,
          data.storeName,
        ).catch(console.error);

        emailService.sendNewApplicationAdminEmail(
          config.adminEmail,
          `${user.firstName} ${user.lastName}`,
          data.storeName,
          application.id,
        ).catch(console.error);
      }

      res.status(201).json({
        success: true,
        message: 'Seller application submitted successfully! We will review it within 1-3 business days.',
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/seller/application-status
 * Check own application status
 */
router.get(
  '/application-status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applications = await prisma.sellerApplication.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          storeName: true,
          businessType: true,
          ghanaRegion: true,
          rejectionReason: true,
          adminNotes: true,
          createdAt: true,
          updatedAt: true,
          reviewedAt: true,
        },
      });

      res.json({
        success: true,
        data: { applications },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/seller/store-settings
 * Update store description and social links
 */
router.put(
  '/store-settings',
  authenticate,
  requireSellerOrAdmin,
  validate(updateStoreSettingsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await prisma.sellerProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!profile) {
        throw new ApiError(404, 'Seller profile not found.');
      }

      const data: UpdateStoreSettingsInput = req.body;

      const updated = await prisma.sellerProfile.update({
        where: { userId: req.user!.id },
        data: {
          description: data.description,
        },
      });

      res.json({
        success: true,
        message: 'Store settings updated.',
        data: { profile: updated },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== EXISTING ENDPOINTS ====================


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
 * GET /api/seller/products
 * Get seller's own products
 */
router.get(
  '/products',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string; // 'active', 'inactive', 'out_of_stock'

      if (!req.user!.sellerProfile) {
         return res.status(400).json({ success: false, message: 'Seller profile not found' });
      }

      // We need to implement getSellerProducts in SellerService or use Prisma directly here.
      // Since SellerService is imported, let's see if it has this method. 
      // I suspect it doesn't. I'll use sellerService.getSellerProducts if I add it, or just use Prisma here for speed if service is not easily modifiable.
      // But best practice is service. 
      // I'll call a new method on sellerService and then I'll have to update SellerService.
      // Wait, let's check `backend/src/services/seller.service.ts` first.
      
      const result = await sellerService.getSellerProducts(req.user!.sellerProfile.id, { page, limit, search, status });
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
