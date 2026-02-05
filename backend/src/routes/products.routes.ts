import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate, validateQuery } from '../middleware/validate.middleware.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { 
  createProductSchema, 
  updateProductSchema, 
  productQuerySchema,
  CreateProductInput,
  UpdateProductInput 
} from '../utils/validators.js';
import { generateSlug } from '../utils/helpers.js';

const router = Router();

/**
 * GET /api/products
 * List all products with pagination, filtering, and sorting
 */
router.get(
  '/',
  validateQuery(productQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page = '1',
        limit = '12',
        category,
        search,
        inStock,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        order = 'desc',
      } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 50); // Max 50 items
      const skip = (pageNum - 1) * limitNum;
      
      // Build where clause
      const where: Record<string, unknown> = {};
      
      if (category) {
        where.category = { slug: category };
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ];
      }
      
      if (inStock === 'true') {
        where.inStock = true;
      } else if (inStock === 'false') {
        where.inStock = false;
      }
      
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) (where.price as Record<string, number>).gte = parseFloat(minPrice as string);
        if (maxPrice) (where.price as Record<string, number>).lte = parseFloat(maxPrice as string);
      }
      
      // Query products
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { [sortBy as string]: order },
          skip,
          take: limitNum,
        }),
        prisma.product.count({ where }),
      ]);
      
      res.json({
        success: true,
        data: {
          products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/products/:id
 * Get single product by ID or slug
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Try to find by ID first, then by slug
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id },
            { slug: id },
          ],
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
      
      if (!product) {
        throw new ApiError(404, 'Product not found.');
      }
      
      res.json({
        success: true,
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/products
 * Create new product (Admin only)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as CreateProductInput;
      
      // Check category exists
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      
      if (!category) {
        throw new ApiError(400, 'Category not found.');
      }
      
      // Generate unique slug
      let slug = generateSlug(data.name);
      const existingProduct = await prisma.product.findUnique({ where: { slug } });
      if (existingProduct) {
        slug = `${slug}-${Date.now()}`;
      }
      
      const product = await prisma.product.create({
        data: {
          ...data,
          slug,
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully!',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/products/:id
 * Update product (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = req.body as UpdateProductInput;
      
      // Check product exists
      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        throw new ApiError(404, 'Product not found.');
      }
      
      // Update slug if name changed
      let updateData: UpdateProductInput & { slug?: string } = { ...data };
      if (data.name && data.name !== existingProduct.name) {
        let newSlug = generateSlug(data.name);
        const slugExists = await prisma.product.findFirst({ 
          where: { slug: newSlug, id: { not: id } } 
        });
        if (slugExists) {
          newSlug = `${newSlug}-${Date.now()}`;
        }
        updateData.slug = newSlug;
      }
      
      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
      
      res.json({
        success: true,
        message: 'Product updated successfully!',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/products/:id
 * Delete product (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        throw new ApiError(404, 'Product not found.');
      }
      
      await prisma.product.delete({ where: { id } });
      
      res.json({
        success: true,
        message: 'Product deleted successfully!',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
