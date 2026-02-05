import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { createCategorySchema, CreateCategoryInput } from '../utils/validators.js';
import { generateSlug } from '../utils/helpers.js';

const router = Router();

/**
 * GET /api/categories
 * List all categories with hierarchy
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tree = 'false' } = req.query;
      
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
 * Get single category with its products
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { page = '1', limit = '20' } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 50);
      const skip = (pageNum - 1) * limitNum;
      
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
            select: { id: true, name: true, slug: true },
          },
          _count: { select: { products: true } },
        },
      });
      
      if (!category) {
        throw new ApiError(404, 'Category not found.');
      }
      
      // Get products in this category and its children
      const categoryIds = [category.id, ...category.children.map(c => c.id)];
      
      const [products, totalProducts] = await Promise.all([
        prisma.product.findMany({
          where: {
            categoryId: { in: categoryIds },
            isActive: true,
          },
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
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
      
      res.json({
        success: true,
        data: {
          category,
          products: products.map(p => ({
            ...p,
            priceInCedis: p.priceInPesewas / 100,
          })),
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
