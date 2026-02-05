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
 * List all categories
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: 'asc' },
      });
      
      res.json({
        success: true,
        data: { categories },
      });
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
      
      const category = await prisma.category.findFirst({
        where: {
          OR: [
            { id },
            { slug: id },
          ],
        },
        include: {
          products: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { products: true },
          },
        },
      });
      
      if (!category) {
        throw new ApiError(404, 'Category not found.');
      }
      
      res.json({
        success: true,
        data: { category },
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
      const { name, image } = req.body as CreateCategoryInput;
      
      // Check if category already exists
      const existingCategory = await prisma.category.findFirst({
        where: { 
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { slug: generateSlug(name) },
          ],
        },
      });
      
      if (existingCategory) {
        throw new ApiError(409, 'A category with this name already exists.');
      }
      
      const category = await prisma.category.create({
        data: {
          name,
          slug: generateSlug(name),
          image,
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
        include: { _count: { select: { products: true } } },
      });
      
      if (!category) {
        throw new ApiError(404, 'Category not found.');
      }
      
      if (category._count.products > 0) {
        throw new ApiError(400, 'Cannot delete category with products. Remove products first.');
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
