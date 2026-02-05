import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { searchLimiter } from '../middleware/rate-limit.middleware.js';
import { cacheSearch } from '../middleware/cache.middleware.js';
import { z } from 'zod';

const router = Router();

// ==================== VALIDATION ====================

const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  category: z.string().optional(),
  minPrice: z.string().regex(/^\d+$/).optional(),
  maxPrice: z.string().regex(/^\d+$/).optional(),
  rating: z.string().regex(/^[1-5]$/).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

// ==================== ROUTES ====================

// Main search endpoint
router.get(
  '/',
  searchLimiter,
  optionalAuth,
  cacheSearch,
  async (req: Request, res: Response) => {
    try {
      const validation = searchQuerySchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid search parameters',
          errors: validation.error.errors,
        });
      }

      const {
        q,
        category,
        minPrice,
        maxPrice,
        rating,
        inStock,
        sort = 'relevance',
      } = validation.data;

      const page = parseInt(validation.data.page || '1');
      const limit = Math.min(parseInt(validation.data.limit || '20'), 50);

      // Build where clause
      const where: any = {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { metaTitle: { contains: q, mode: 'insensitive' } },
          { metaDescription: { contains: q, mode: 'insensitive' } },
        ],
      };

      // Category filter (by slug)
      if (category) {
        const cat = await prisma.category.findFirst({
          where: {
            OR: [
              { slug: category },
              { id: category },
            ],
          },
          include: { children: { select: { id: true } } },
        });

        if (cat) {
          // Include subcategories
          const categoryIds = [cat.id, ...cat.children.map((c) => c.id)];
          where.categoryId = { in: categoryIds };
        }
      }

      // Price filter (in pesewas)
      if (minPrice) {
        where.priceInPesewas = { ...where.priceInPesewas, gte: parseInt(minPrice) };
      }
      if (maxPrice) {
        where.priceInPesewas = { ...where.priceInPesewas, lte: parseInt(maxPrice) };
      }

      // Rating filter
      if (rating) {
        where.averageRating = { gte: parseInt(rating) };
      }

      // Stock filter
      if (inStock === 'true') {
        where.stockQuantity = { gt: 0 };
      }

      // Build order by
      let orderBy: any = [{ isFeatured: 'desc' }];
      
      switch (sort) {
        case 'price_asc':
          orderBy.push({ priceInPesewas: 'asc' });
          break;
        case 'price_desc':
          orderBy.push({ priceInPesewas: 'desc' });
          break;
        case 'rating':
          orderBy.push({ averageRating: 'desc' });
          break;
        case 'newest':
          orderBy.push({ createdAt: 'desc' });
          break;
        default: // relevance - featured first, then by rating
          orderBy.push({ averageRating: 'desc' });
          break;
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      // Format results
      const results = products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description?.substring(0, 150),
        priceInCedis: p.priceInPesewas / 100,
        comparePriceInCedis: p.comparePriceInPesewas
          ? p.comparePriceInPesewas / 100
          : null,
        image: p.images[0]?.url || null,
        category: p.category,
        averageRating: Number(p.averageRating),
        reviewCount: p.reviewCount,
        inStock: p.stockQuantity > 0,
        isFeatured: p.isFeatured,
      }));

      res.json({
        success: true,
        data: {
          query: q,
          results,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
          filters: {
            category,
            minPrice: minPrice ? parseInt(minPrice) / 100 : null,
            maxPrice: maxPrice ? parseInt(maxPrice) / 100 : null,
            rating: rating ? parseInt(rating) : null,
            inStock: inStock === 'true',
            sort,
          },
        },
      });
    } catch (error: any) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
      });
    }
  }
);

// Search suggestions/autocomplete
router.get('/suggestions', searchLimiter, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    
    if (q.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] },
      });
    }

    // Get matching products
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, name: true, slug: true },
      take: 5,
    });

    // Get matching categories
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, name: true, slug: true },
      take: 3,
    });

    const suggestions = [
      ...products.map((p) => ({
        type: 'product' as const,
        id: p.id,
        text: p.name,
        slug: p.slug,
      })),
      ...categories.map((c) => ({
        type: 'category' as const,
        id: c.id,
        text: c.name,
        slug: c.slug,
      })),
    ];

    res.json({
      success: true,
      data: { suggestions },
    });
  } catch (error: any) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
    });
  }
});

// Popular searches (based on product popularity)
router.get('/popular', cacheSearch, async (req: Request, res: Response) => {
  try {
    // Get top-selling products as "popular"
    const popular = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: [
        { isFeatured: 'desc' },
        { reviewCount: 'desc' },
        { averageRating: 'desc' },
      ],
      take: 8,
    });

    res.json({
      success: true,
      data: {
        popular: popular.map((p) => ({
          text: p.name,
          slug: p.slug,
        })),
      },
    });
  } catch (error: any) {
    console.error('Popular searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular searches',
    });
  }
});

export default router;
