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
import { redisService } from '../services/redis.service.js';

const router = Router();

const CACHE_TTL = 3600; // 1 hour

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
        seller, // Filter by seller slug or ID
      } = req.query;
      
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = Math.min(parseInt(limit as string, 10) || 20, 50);
      const skip = (pageNum - 1) * limitNum;

      // Cache key generation
      const cacheKey = `products:list:${JSON.stringify(req.query)}`;
      const cachedData = await redisService.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
      
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

      // Seller filter
      if (seller) {
        const sellerProfile = await prisma.sellerProfile.findFirst({
            where: { OR: [{ id: seller as string }, { slug: seller as string }] },
            select: { id: true }
        });
        if (sellerProfile) {
            where.sellerId = sellerProfile.id;
        } else {
            // If seller not found, return empty or ignore? Return empty seems correct.
            where.sellerId = 'non-existent'; 
        }
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
        image: product.images[0]?.url || null,
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

      // Cache the result
      await redisService.set(cacheKey, {
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
      }, CACHE_TTL);

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
  optionalAuth, // Add optional auth to check if user is seller/admin
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // Try cache first (only for public GET, if auth logic is complex might skip cache or key by user role?)
      // For now, cache public view.
      const cacheKey = `products:detail:${id}`;
      // Note: If we cache, we miss view increment? 
      // Strategy: Cache product data, but increment view async.
      
      let product = await redisService.get<any>(cacheKey);

      if (!product) {
        product = await prisma.product.findFirst({
          where: {
            OR: [
              { id },
              { slug: id },
              { sku: id },
            ],
          },
          include: {
            category: true,
            seller: {
                select: {
                    id: true,
                    businessName: true,
                    slug: true,
                    logoUrl: true,
                    rating: true
                }
            },
            images: {
              orderBy: { sortOrder: 'asc' },
            },
            reviews: {
              where: { isApproved: true },
              include: {
                user: {
                  select: { firstName: true, lastName: true, avatarUrl: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        });

        if (product) {
            await redisService.set(cacheKey, product, CACHE_TTL);
        }
      }
      
      if (!product) {
        throw new ApiError(404, 'Product not found.');
      }

      // Check visibility
      if (!product.isActive) {
        const isOwner = user?.role === 'SELLER' && user?.sellerProfile?.id === product.sellerId;
        const isAdmin = user?.role === 'ADMIN';
        
        if (!isOwner && !isAdmin) {
             throw new ApiError(404, 'Product not found.');
        }
      }
      
      
      // Async view increment (fire and forget)
      prisma.product.update({
        where: { id: product.id },
        data: { views: { increment: 1 } },
      }).catch(err => console.error('View increment failed', err));

      res.json({
        success: true,
        data: {
          product: {
            ...product,
            priceInCedis: product.priceInPesewas / 100,
            comparePriceInCedis: product.comparePriceInPesewas ? product.comparePriceInPesewas / 100 : null,
            inStock: !product.trackInventory || product.stockQuantity > 0 || product.allowBackorder,
            image: product.images[0]?.url || null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/products/:id/related
 * Get related products based on category
 */
router.get(
    '/:id/related',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const limit = 5;

            // Get source product to find category
            const product = await prisma.product.findFirst({
                where: { OR: [{ id }, { slug: id }] },
                select: { id: true, categoryId: true, category: { select: { parentId: true } } }
            });

            if (!product) {
                throw new ApiError(404, 'Product not found');
            }

            // Find products in same category or sibling categories
            const relatedProducts = await prisma.product.findMany({
                where: {
                    id: { not: product.id },
                    isActive: true,
                    OR: [
                        { categoryId: product.categoryId },
                        // Optional: Include parent category if needed
                        // { category: { parentId: product.category.parentId } }
                    ]
                },
                include: {
                    images: { where: { isPrimary: true }, take: 1 },
                    category: { select: { name: true, slug: true } }
                },
                orderBy: { views: 'desc' }, // Show popular related products
                take: limit
            });

            res.json({
                success: true,
                data: relatedProducts.map(p => ({
                    ...p,
                    priceInCedis: p.priceInPesewas / 100,
                    image: p.images[0]?.url || null
                }))
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
      
      // Generate slug with number increment if duplicate
      let slug = generateSlug(productData.name);
      
      // Check for duplicate slug
      let suffix = 0;
      while (await prisma.product.findUnique({ where: { slug } })) {
          suffix++;
          slug = `${generateSlug(productData.name)}-${suffix}`;
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
 * PUT /api/products/:id/images
 * Update product images (add, remove, reorder)
 * Expects { images: [{ url: string, isPrimary: boolean, sortOrder: number }] }
 */
router.put(
  '/:id/images',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { images } = req.body;
      const user = (req as any).user;

      if (!Array.isArray(images)) {
        throw new ApiError(400, 'Images must be an array');
      }

      // Check ownership
      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) throw new ApiError(404, 'Product not found');

      if (user.role !== 'ADMIN') {
         if (existingProduct.sellerId !== user.sellerProfile?.id) {
            throw new ApiError(403, 'Not authorized to update this product');
         }
      }

      // Transaction to replace images
      await prisma.$transaction(async (tx) => {
        // Delete all existing images
        await tx.productImage.deleteMany({ where: { productId: id } });

        // Insert new images
        if (images.length > 0) {
            await tx.productImage.createMany({
                data: images.map((img: any, index: number) => ({
                    productId: id,
                    url: img.url,
                    isPrimary: img.isPrimary || index === 0,
                    sortOrder: img.sortOrder || index
                }))
            });
        }
      });

      // Invalidate caches
      await redisService.del(`products:detail:${id}`);
      await redisService.del(`products:detail:${existingProduct.slug}`);
      await redisService.clearPattern('products:list:*');

      const updatedProduct = await prisma.product.findUnique({
          where: { id },
          include: { images: { orderBy: { sortOrder: 'asc' } } }
      });

      res.json({
        success: true,
        message: 'Product images updated successfully',
        data: { images: updatedProduct?.images }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/products/:id
 * Update product (Admin/Seller own products)
 */
router.put(
  '/:id',
  authenticate,
  requireSellerOrAdmin,
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

      // Check ownership if SELLER
      if (req.user?.role === 'SELLER') {
        if (!req.user.sellerProfile) {
           throw new ApiError(403, 'Seller profile not found.');
        }
        if (existingProduct.sellerId !== req.user.sellerProfile.id) {
          throw new ApiError(403, 'You can only update your own products.');
        }
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

      // Handle Inventory Logging if stock changes
      if (updateData.stockQuantity !== undefined && updateData.stockQuantity !== existingProduct.stockQuantity) {
        const quantityChange = updateData.stockQuantity - existingProduct.stockQuantity;
        const action = quantityChange > 0 ? 'RESTOCK' : 'ADJUSTMENT'; // Or SALE/RETURN if implemented elsewhere

        await prisma.inventoryLog.create({
          data: {
            productId: id,
            action,
            quantityChange,
            previousQuantity: existingProduct.stockQuantity,
            newQuantity: updateData.stockQuantity,
            userId: req.user?.id,
            notes: 'Manual update via Product Edit',
          },
        });
      }
      
      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: { category: true },
      });

      // Invalidate caches
      await redisService.del(`products:detail:${id}`);
      await redisService.del(`products:detail:${product.slug}`);
      await redisService.clearPattern('products:list:*');

      
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
 * Delete product (Admin/Seller own products) - Soft delete by setting isActive to false
 */
router.delete(
  '/:id',
  authenticate,
  requireSellerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        throw new ApiError(404, 'Product not found.');
      }

      // Check ownership if SELLER
      if (req.user?.role === 'SELLER') {
        if (!req.user.sellerProfile) {
           throw new ApiError(403, 'Seller profile not found.');
        }
        if (product.sellerId !== req.user.sellerProfile.id) {
          throw new ApiError(403, 'You can only delete your own products.');
        }
      }
      
      // Check if product has order history
      const orderCount = await prisma.orderItem.count({ where: { productId: id } });
      
      if (orderCount > 0) {
        // Soft delete - preserve order history
        await prisma.product.update({
          where: { id },
          data: { isActive: false },
        });

        // Invalidate caches
        await redisService.del(`products:detail:${id}`);
        await redisService.del(`products:detail:${product.slug}`);
        await redisService.clearPattern('products:list:*');
        
        res.json({
          success: true,
          message: 'Product deactivated (preserved for order history).',
        });
      } else {
        // Hard delete - no orders reference this product
        await prisma.product.delete({ where: { id } });

        // Invalidate caches
        await redisService.del(`products:detail:${id}`);
        await redisService.del(`products:detail:${product.slug}`);
        await redisService.clearPattern('products:list:*');
        
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
