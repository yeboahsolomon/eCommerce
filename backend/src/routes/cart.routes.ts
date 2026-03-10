import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { cartService } from '../services/cart.service.js';
import { addToCartSchema, updateCartItemSchema, AddToCartInput, UpdateCartItemInput } from '../utils/validators.js';

const router = Router();

/**
 * GET /api/cart
 * Get user's cart with items
 */
router.get(
  '/',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || null;
      const sessionId = req.headers['x-session-id'] as string || req.query.sessionId as string;

      if (!userId && !sessionId) {
        // Just return empty if no identity
        // Or create a new session ID? Frontend should handle session ID generation usually.
        // For now, assume frontend sends it.
        return res.json({ success: true, data: { cart: { items: [], total: 0 } } });
      }

      const cartData = await cartService.getCart(userId, sessionId);

      res.json({
        success: true,
        data: { cart: cartData }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/cart/items
 * Add item to cart
 */
router.post(
  '/items',
  optionalAuth,
  validate(addToCartSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, variantId, quantity = 1 } = req.body as AddToCartInput;
      const userId = (req as any).user?.id || null;
      const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;

      if (!userId && !sessionId) {
        throw new ApiError(400, 'Session ID required for guest cart');
      }

      // Check product validity (Optional here, Service also checks, but good for Validation)
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) throw new ApiError(404, 'Product not found');

      // Add to cart via Service
      const cart = await cartService.addItem(userId, sessionId, { productId, variantId, quantity });

      res.status(201).json({
        success: true,
        message: 'Item added to cart!',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/cart/items/:id
 * Update cart item quantity
 */
router.put(
  '/items/:id',
  optionalAuth,
  validate(updateCartItemSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params; // Product ID, NOT cart item ID in new design? 
      // ERROR: `cart.routes.ts` used `items/:id` where ID was `CartItem.id` (UUID).
      // But Guest Cart (Redis) doesn't have CartItem IDs, it has Product IDs.
      // So we must standardise on ProductID for URL or handle both.
      // Requirement says: PUT /api/cart/items/:productId.
      // Existing code used `items/:id` targeting CartItem.id.
      // I will switch to `items/:productId` to support both.
      
      const { quantity } = req.body as UpdateCartItemInput;
      const userId = (req as any).user?.id || null;
      const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
      
      const cart = await cartService.updateItem(userId, sessionId, id, quantity); // ID passed as product ID

      res.json({
        success: true,
        message: 'Cart updated!',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/cart/items/:id
 * Remove item from cart
 */
// DELETE /items/:id (id is now productId)
router.delete(
  '/items/:id',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params; // productId
      const userId = (req as any).user?.id || null;
      const sessionId = req.headers['x-session-id'] as string || req.query.sessionId as string;

      const cart = await cartService.removeItem(userId, sessionId, id);

      res.json({
        success: true,
        message: 'Item removed from cart!',
        data: { cart }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || null;
      const sessionId = req.headers['x-session-id'] as string || req.query.sessionId as string;

      await cartService.clearCart(userId, sessionId);
      
      res.json({
        success: true,
        message: 'Cart cleared!',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/cart/merge
 * Merge guest cart items (from localStorage) into authenticated user's DB cart
 */
router.post(
    '/merge',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { items } = req.body;
            if (!items || !Array.isArray(items) || items.length === 0) {
                // Nothing to merge, just return the current DB cart
                const cart = await cartService.getCart(req.user!.id, '');
                return res.json({ success: true, message: 'Nothing to merge', data: { cart } });
            }

            // Merge each guest item into the DB cart
            for (const item of items) {
                if (item.productId && item.quantity > 0) {
                    try {
                        await cartService.addItem(req.user!.id, '', { productId: item.productId, quantity: item.quantity });
                    } catch (e) {
                        // Skip invalid products silently
                        console.warn(`Merge: skipped product ${item.productId}`, e);
                    }
                }
            }

            const cart = await cartService.getCart(req.user!.id, '');
            res.json({
                success: true,
                message: 'Carts merged',
                data: { cart }
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
