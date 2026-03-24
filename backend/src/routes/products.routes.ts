import { Router, Request, Response, NextFunction } from 'express';
import { validate, validateQuery } from '../middleware/validate.middleware.js';
import { authenticate, requireSellerOrAdmin, optionalAuth } from '../middleware/auth.middleware.js';
import { 
  createProductSchema, 
  updateProductSchema, 
  productQuerySchema,
  CreateProductInput,
  UpdateProductInput 
} from '../utils/validators.js';
import { productService } from '../services/product.service.js';

const router = Router();

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Retrieve a list of products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID or slug to filter by
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for product name or description
 *     responses:
 *       200:
 *         description: A paginated list of products
 */
router.get(
  '/',
  validateQuery(productQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await productService.getProducts(req.query);
      res.json(result);
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
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const result = await productService.getProductById(id, user);
      
      res.json({
        success: true,
        data: result,
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
            const data = await productService.getRelatedProducts(id);

            res.json({
                success: true,
                data
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
      const user = (req as any).user;
      const data = await productService.createProduct(req.body as CreateProductInput & { images?: string[], variants?: any[] }, user);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully!',
        data,
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

      const data = await productService.updateProductImages(id, images, user);

      res.json({
        success: true,
        message: 'Product images updated successfully',
        data
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
      const user = (req as any).user;
      
      const data = await productService.updateProduct(id, req.body as UpdateProductInput & { images?: string[], variants?: any[] }, user);

      res.json({
        success: true,
        message: 'Product updated successfully!',
        data,
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
      const user = (req as any).user;
      
      const data = await productService.deleteProduct(id, user);

      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
