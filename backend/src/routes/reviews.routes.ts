import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { z } from 'zod';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100).optional(),
  comment: z.string().min(10, 'Review must be at least 10 characters').max(1000).optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(3).max(100).optional(),
  comment: z.string().min(10).max(1000).optional(),
});

// ==================== ROUTES ====================

// Get reviews for a product (public)
router.get(
  '/product/:productId',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const sort = (req.query.sort as string) || 'recent';
      const rating = req.query.rating ? parseInt(req.query.rating as string) : undefined;

      // Build where clause
      const where: any = {
        productId,
        isApproved: true, // Only show approved reviews
      };

      if (rating) {
        where.rating = rating;
      }

      // Build order by
      let orderBy: any = { createdAt: 'desc' };
      if (sort === 'rating_high') {
        orderBy = { rating: 'desc' };
      } else if (sort === 'rating_low') {
        orderBy = { rating: 'asc' };
      } else if (sort === 'helpful') {
        orderBy = { createdAt: 'desc' }; // Could add helpful votes later
      }

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.review.count({ where }),
      ]);

      // Get rating distribution
      const ratingDistribution = await prisma.review.groupBy({
        by: ['rating'],
        where: { productId, isApproved: true },
        _count: { rating: true },
      });

      // Format distribution
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingDistribution.forEach((item) => {
        distribution[item.rating] = item._count.rating;
      });

      // Get product average
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { averageRating: true, reviewCount: true },
      });

      res.json({
        success: true,
        data: {
          reviews: reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            isVerifiedPurchase: r.isVerifiedPurchase,
            createdAt: r.createdAt,
            user: {
              id: r.user.id,
              name: `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
              avatar: r.user.avatarUrl,
            },
          })),
          summary: {
            averageRating: product ? Number(product.averageRating) : 0,
            totalReviews: product?.reviewCount || 0,
            distribution,
          },
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      console.error('Get reviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get reviews',
      });
    }
  }
);

// Submit a review for a product (auth required)
router.post(
  '/product/:productId',
  authMiddleware,
  validate(createReviewSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.params;
      const { rating, title, comment } = req.body;

      // Check product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Check if user already reviewed this product
      const existingReview = await prisma.review.findUnique({
        where: {
          productId_userId: { productId, userId },
        },
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this product',
        });
      }

      // Check if user has purchased this product (verified purchase)
      const hasPurchased = await prisma.orderItem.findFirst({
        where: {
          productId,
          order: {
            userId,
            status: 'DELIVERED',
          },
        },
      });

      // Create review
      const review = await prisma.review.create({
        data: {
          productId,
          userId,
          rating,
          title,
          comment,
          isVerifiedPurchase: !!hasPurchased,
          isApproved: true, // Auto-approve for now (could add moderation)
        },
      });

      // Update product average rating
      const stats = await prisma.review.aggregate({
        where: { productId, isApproved: true },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await prisma.product.update({
        where: { id: productId },
        data: {
          averageRating: stats._avg.rating || 0,
          reviewCount: stats._count.rating,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: {
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isVerifiedPurchase: review.isVerifiedPurchase,
          createdAt: review.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Create review error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit review',
      });
    }
  }
);

// Update own review
router.put(
  '/:reviewId',
  authMiddleware,
  validate(updateReviewSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { reviewId } = req.params;
      const { rating, title, comment } = req.body;

      const review = await prisma.review.findFirst({
        where: { id: reviewId, userId },
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
        });
      }

      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          ...(rating !== undefined && { rating }),
          ...(title !== undefined && { title }),
          ...(comment !== undefined && { comment }),
        },
      });

      // Update product average if rating changed
      if (rating !== undefined && rating !== review.rating) {
        const stats = await prisma.review.aggregate({
          where: { productId: review.productId, isApproved: true },
          _avg: { rating: true },
        });

        await prisma.product.update({
          where: { id: review.productId },
          data: { averageRating: stats._avg.rating || 0 },
        });
      }

      res.json({
        success: true,
        message: 'Review updated successfully',
        data: updatedReview,
      });
    } catch (error: any) {
      console.error('Update review error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update review',
      });
    }
  }
);

// Delete own review
router.delete(
  '/:reviewId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { reviewId } = req.params;

      const review = await prisma.review.findFirst({
        where: { id: reviewId, userId },
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
        });
      }

      await prisma.review.delete({
        where: { id: reviewId },
      });

      // Update product stats
      const stats = await prisma.review.aggregate({
        where: { productId: review.productId, isApproved: true },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await prisma.product.update({
        where: { id: review.productId },
        data: {
          averageRating: stats._avg.rating || 0,
          reviewCount: stats._count.rating,
        },
      });

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete review error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete review',
      });
    }
  }
);

// Get user's own reviews
router.get('/my-reviews', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          isVerifiedPurchase: r.isVerifiedPurchase,
          createdAt: r.createdAt,
          product: {
            id: r.product.id,
            name: r.product.name,
            slug: r.product.slug,
            image: r.product.images[0]?.url || null,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reviews',
    });
  }
});

export default router;
