import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate, validateQuery } from '../middleware/validate.middleware.js';
import { authenticate, requireAdmin, requireSellerOrAdmin, optionalAuth } from '../middleware/auth.middleware.js';
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
 * List products with filtering, sorting, and pagination
 */
router.get(
  '/',
  validateQuery(productQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page = '1',
        limit = '20',
        category,
        search,
        inStock,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        order = 'desc',
        featured,
      } = req.query;
      
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = Math.min(parseInt(limit as string, 10) || 20, 50);
      const skip = (pageNum - 1) * limitNum;
      
      // Build filter
      const where: any = {
        isActive: true,
      };
      
      // Category filter (by ID or slug)
      if (category) {
        const cat = await prisma.category.findFirst({
          where: { OR: [{ id: category as string }, { slug: category as string }] },
          include: { children: { select: { id: true } } },
        });
        if (cat) {
          // Include subcategories
          const categoryIds = [cat.id, ...cat.children.map(c => c.id)];
          where.categoryId = { in: categoryIds };
        }
      }
      
      // Search
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { sku: { equals: search as string, mode: 'insensitive' } },
        ];
      }
      
      // Stock filter
      if (inStock === 'true') {
        where.OR = [
          { trackInventory: false },
          { stockQuantity: { gt: 0 } },
          { allowBackorder: true },
        ];
      }
      
      // Price range (in pesewas)
      if (minPrice || maxPrice) {
        where.priceInPesewas = {};
        if (minPrice) where.priceInPesewas.gte = parseInt(minPrice as string, 10);
        if (maxPrice) where.priceInPesewas.lte = parseInt(maxPrice as string, 10);
      }
      
      // Featured
      if (featured === 'true') {
        where.isFeatured = true;
      }
      
      // Build sort
      const orderBy: any = {};
      orderBy[sortBy as string] = order;
      
      // Fetch products
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 5,
            },
          },
          orderBy,
          skip,
          take: limitNum,
        }),
        prisma.product.count({ where }),
      ]);
      
      // Transform prices to include cedis
      const transformedProducts = products.map(product => ({
        ...product,
        priceInCedis: product.priceInPesewas / 100,
        comparePriceInCedis: product.comparePriceInPesewas ? product.comparePriceInPesewas / 100 : null,
        inStock: !product.trackInventory || product.stockQuantity > 0 || product.allowBackorder,
      }));
      
      res.json({
        success: true,
        data: {
          products: transformedProducts,
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
      
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id },
            { slug: id },
            { sku: id },
          ],
          isActive: true,
        },
        include: {
          category: true,
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          reviews: {
            where: { isApproved: true },
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
      
      if (!product) {
        throw new ApiError(404, 'Product not found.');
      }
      
      res.json({
        success: true,
        data: {
          product: {
            ...product,
            priceInCedis: product.priceInPesewas / 100,
            comparePriceInCedis: product.comparePriceInPesewas ? product.comparePriceInPesewas / 100 : null,
            inStock: !product.trackInventory || product.stockQuantity > 0 || product.allowBackorder,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/products
 * Create new product (Admin/Seller only)
 */
router.post(
  '/',
  authenticate,
  authenticate,
  requireSellerOrAdmin,
  validate(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productData = req.body as CreateProductInput;
      
      // Assign Seller ID
      let sellerId = productData.sellerId;
      if (req.user?.role === 'SELLER') {
        if (!req.user.sellerProfile) {
          throw new ApiError(400, 'Seller profile not found. Please complete your seller profile.');
        }
        sellerId = req.user.sellerProfile.id;
      }
      
      // Generate slug
      let slug = generateSlug(productData.name);
      
      // Check for duplicate slug
      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
      
      // Check SKU uniqueness
      if (productData.sku) {
        const existingSku = await prisma.product.findUnique({ 
          where: { sku: productData.sku } 
        });
        if (existingSku) {
          throw new ApiError(409, 'A product with this SKU already exists.');
        }
      }
      
      const product = await prisma.product.create({
        data: {
          ...productData,
          slug,
          sellerId,
        },
        include: {
          category: true,
        },
      });
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully!',
        data: {
          product: {
            ...product,
            priceInCedis: product.priceInPesewas / 100,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/products/:id
 * Update product (Admin/Seller only)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData = req.body as UpdateProductInput;
      
      // Check product exists
      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        throw new ApiError(404, 'Product not found.');
      }
      
      // If updating name, update slug too
      if (updateData.name && updateData.name !== existingProduct.name) {
        (updateData as any).slug = generateSlug(updateData.name);
      }
      
      // Check SKU uniqueness if updating
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const existingSku = await prisma.product.findFirst({
          where: { sku: updateData.sku, id: { not: id } },
        });
        if (existingSku) {
          throw new ApiError(409, 'A product with this SKU already exists.');
        }
      }
      
      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: { category: true },
      });
      
      res.json({
        success: true,
        message: 'Product updated successfully!',
        data: {
          product: {
            ...product,
            priceInCedis: product.priceInPesewas / 100,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/products/:id
 * Delete product (Admin only) - Soft delete by setting isActive to false
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
      
      // Check if product has order history
      const orderCount = await prisma.orderItem.count({ where: { productId: id } });
      
      if (orderCount > 0) {
        // Soft delete - preserve order history
        await prisma.product.update({
          where: { id },
          data: { isActive: false },
        });
        
        res.json({
          success: true,
          message: 'Product deactivated (preserved for order history).',
        });
      } else {
        // Hard delete - no orders reference this product
        await prisma.product.delete({ where: { id } });
        
        res.json({
          success: true,
          message: 'Product deleted successfully!',
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
