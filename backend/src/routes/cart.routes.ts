import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { addToCartSchema, updateCartItemSchema, AddToCartInput, UpdateCartItemInput } from '../utils/validators.js';

const router = Router();

/**
 * GET /api/cart
 * Get user's cart with items
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get or create cart
      let cart = await prisma.cart.findUnique({
        where: { userId: req.user!.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  originalPrice: true,
                  image: true,
                  inStock: true,
                  stockQuantity: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      
      // Create cart if doesn't exist
      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId: req.user!.id },
          include: { items: { include: { product: true } } },
        });
      }
      
      // Calculate totals
      const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = cart.items.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity, 
        0
      );
      
      res.json({
        success: true,
        data: {
          cart: {
            ...cart,
            totalItems,
            totalPrice,
          },
        },
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
  authenticate,
  validate(addToCartSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, quantity = 1 } = req.body as AddToCartInput;
      
      // Check product exists and is in stock
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      
      if (!product) {
        throw new ApiError(404, 'Product not found.');
      }
      
      if (!product.inStock) {
        throw new ApiError(400, 'Product is out of stock.');
      }
      
      // Get or create cart
      let cart = await prisma.cart.findUnique({
        where: { userId: req.user!.id },
      });
      
      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId: req.user!.id },
        });
      }
      
      // Check if item already in cart
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });
      
      let cartItem;
      
      if (existingItem) {
        // Update quantity
        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
          include: { product: true },
        });
      } else {
        // Create new item
        cartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
          },
          include: { product: true },
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Item added to cart!',
        data: { item: cartItem },
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
  authenticate,
  validate(updateCartItemSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body as UpdateCartItemInput;
      
      // Find cart item and verify ownership
      const cartItem = await prisma.cartItem.findUnique({
        where: { id },
        include: { cart: true },
      });
      
      if (!cartItem || cartItem.cart.userId !== req.user!.id) {
        throw new ApiError(404, 'Cart item not found.');
      }
      
      const updatedItem = await prisma.cartItem.update({
        where: { id },
        data: { quantity },
        include: { product: true },
      });
      
      res.json({
        success: true,
        message: 'Cart updated!',
        data: { item: updatedItem },
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
router.delete(
  '/items/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Find cart item and verify ownership
      const cartItem = await prisma.cartItem.findUnique({
        where: { id },
        include: { cart: true },
      });
      
      if (!cartItem || cartItem.cart.userId !== req.user!.id) {
        throw new ApiError(404, 'Cart item not found.');
      }
      
      await prisma.cartItem.delete({ where: { id } });
      
      res.json({
        success: true,
        message: 'Item removed from cart!',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/cart
 * Clear entire cart
 */
router.delete(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cart = await prisma.cart.findUnique({
        where: { userId: req.user!.id },
      });
      
      if (cart) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }
      
      res.json({
        success: true,
        message: 'Cart cleared!',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
