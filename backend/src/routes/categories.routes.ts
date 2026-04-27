import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { createCategorySchema, CreateCategoryInput } from '../utils/validators.js';
import { generateSlug } from '../utils/helpers.js';
import { redisService } from '../services/redis.service.js';

const router = Router();
const CACHE_TTL = 3600; // 1 hour

/**
 * GET /api/categories
 * List all categories with hierarchy
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tree = 'false' } = req.query;
      
      const cacheKey = `categories:${tree}`;
      const cached = await redisService.get(cacheKey);
      if (cached) return res.json(cached);

      if (tree === 'true') {
        // Return hierarchical structure
        const rootCategories = await prisma.category.findMany({
          where: { 
            parentId: null,
            isActive: true,
          },
          include: {
            children: {
              where: { isActive: true },
              include: {
                _count: { select: { products: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
            _count: { select: { products: true } },
          },
          orderBy: { sortOrder: 'asc' },
        });
        
        // No extra brace here

        await redisService.set(cacheKey, { success: true, data: { categories: rootCategories } }, CACHE_TTL);
        
        res.json({
          success: true,
          data: { categories: rootCategories },
        });
      } else {
        // Flat list
        const categories = await prisma.category.findMany({
          where: { isActive: true },
          include: {
            parent: {
              select: { id: true, name: true, slug: true },
            },
            _count: { select: { products: true } },
          },
          orderBy: [
            { parentId: 'asc' },
            { sortOrder: 'asc' },
            { name: 'asc' },
          ],
        });
        
        // No extra brace here
        
        await redisService.set(cacheKey, { success: true, data: { categories } }, CACHE_TTL);

        res.json({
          success: true,
          data: { categories },
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/categories/:id
 * Get single category with its products.
 * Supports: page, limit, sortBy (createdAt|priceInPesewas|averageRating|salesCount|name), order (asc|desc)
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        order = 'desc',
      } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = Math.min(parseInt(limit as string, 10) || 20, 50);
      const skip = (pageNum - 1) * limitNum;

      // Validate sortBy to prevent injection
      const allowedSorts = ['createdAt', 'priceInPesewas', 'averageRating', 'salesCount', 'name'];
      const safeSortBy = allowedSorts.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
      const safeOrder = (order as string) === 'asc' ? 'asc' : 'desc';

      const category = await prisma.category.findFirst({
        where: {
          OR: [{ id }, { slug: id }],
          isActive: true,
        },
        include: {
          parent: {
            select: { id: true, name: true, slug: true },
          },
          children: {
            where: { isActive: true },
            include: {
              _count: { select: { products: { where: { isActive: true } } } },
            },
            orderBy: { sortOrder: 'asc' },
          },
          _count: { select: { products: { where: { isActive: true } } } },
        },
      });

      if (!category) {
        throw new ApiError(404, 'Category not found.');
      }

      // Include products from this category AND its children (subcategories)
      const categoryIds = [category.id, ...category.children.map(c => c.id)];

      const orderByClause: any = {};
      orderByClause[safeSortBy] = safeOrder;

      const [products, totalProducts] = await Promise.all([
        prisma.product.findMany({
          where: {
            categoryId: { in: categoryIds },
            isActive: true,
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            images: { orderBy: { sortOrder: 'asc' }, take: 5 },
            variants: true,
            seller: {
              select: {
                id: true,
                businessName: true,
                slug: true,
                ghanaRegion: true,
                businessAddress: true,
                logoUrl: true,
              },
            },
          },
          orderBy: orderByClause,
          skip,
          take: limitNum,
        }),
        prisma.product.count({
          where: {
            categoryId: { in: categoryIds },
            isActive: true,
          },
        }),
      ]);

      // Transform products to match the standard product response shape
      const transformedProducts = products.map((p) => ({
        ...p,
        priceInCedis: p.priceInPesewas / 100,
        comparePriceInCedis: p.comparePriceInPesewas ? p.comparePriceInPesewas / 100 : null,
        inStock: !p.trackInventory || p.stockQuantity > 0 || p.allowBackorder,
        image: p.images[0]?.url || null,
      }));

      // Transform children to include product count
      const children = category.children.map((child: any) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        productCount: child._count?.products ?? 0,
      }));

      res.json({
        success: true,
        data: {
          category: {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            parent: category.parent,
            children,
            productCount: (category as any)._count?.products ?? totalProducts,
          },
          products: transformedProducts,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalProducts,
            totalPages: Math.ceil(totalProducts / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/categories
 * Create new category (Admin only)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, image, parentId, sortOrder, isActive } = req.body as CreateCategoryInput;
      
      // Generate slug
      let slug = generateSlug(name);
      
      // Check for duplicate
      const existing = await prisma.category.findFirst({
        where: { 
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { slug },
          ],
        },
      });
      
      if (existing) {
        throw new ApiError(409, 'A category with this name already exists.');
      }
      
      // Verify parent exists if provided
      if (parentId) {
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        if (!parent) {
          throw new ApiError(400, 'Parent category not found.');
        }
      }
      
      const category = await prisma.category.create({
        data: {
          name,
          slug,
          description,
          image,
          parentId,
          sortOrder: sortOrder ?? 0,
          isActive: isActive ?? true,
        },
        include: {
          parent: {
            select: { id: true, name: true },
          },
        },
      });
      
      res.status(201).json({
        success: true,
        message: 'Category created successfully!',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/categories/:id
 * Update category (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(createCategorySchema.partial()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const existing = await prisma.category.findUnique({ where: { id } });
      if (!existing) {
        throw new ApiError(404, 'Category not found.');
      }
      
      // If updating name, update slug
      if (updateData.name && updateData.name !== existing.name) {
        updateData.slug = generateSlug(updateData.name);
      }
      
      const category = await prisma.category.update({
        where: { id },
        data: updateData,
        include: {
          parent: {
            select: { id: true, name: true },
          },
        },
      });
      
      res.json({
        success: true,
        message: 'Category updated successfully!',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/categories/:id
 * Delete category (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { products: true, children: true },
          },
        },
      });
      
      if (!category) {
        throw new ApiError(404, 'Category not found.');
      }
      
      if (category._count.products > 0) {
        throw new ApiError(400, 'Cannot delete category with products. Move or delete products first.');
      }
      
      if (category._count.children > 0) {
        throw new ApiError(400, 'Cannot delete category with subcategories. Delete subcategories first.');
      }
      
      await prisma.category.delete({ where: { id } });
      
      res.json({
        success: true,
        message: 'Category deleted successfully!',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
