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
                  priceInPesewas: true,
                  comparePriceInPesewas: true,
                  images: {
                    where: { isPrimary: true },
                    select: { url: true },
                    take: 1,
                  },
                  isActive: true,
                  stockQuantity: true,
                  trackInventory: true,
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
          include: { 
            items: { 
              include: { 
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    priceInPesewas: true,
                    comparePriceInPesewas: true,
                    images: {
                      where: { isPrimary: true },
                      select: { url: true },
                      take: 1,
                    },
                    isActive: true,
                    stockQuantity: true,
                    trackInventory: true,
                  },
                },
              },
            },
          },
        });
      }
      
      // Calculate totals (in pesewas)
      const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPriceInPesewas = cart.items.reduce(
        (sum, item) => sum + item.product.priceInPesewas * item.quantity, 
        0
      );
      
      // Check for price changes (notify frontend)
      const itemsWithPriceChanges = cart.items.filter(
        item => item.priceAtAddInPesewas !== item.product.priceInPesewas
      );
      
      res.json({
        success: true,
        data: {
          cart: {
            ...cart,
            totalItems,
            totalPriceInPesewas,
            totalPriceInCedis: totalPriceInPesewas / 100,
            priceChanges: itemsWithPriceChanges.length > 0 ? itemsWithPriceChanges.map(item => ({
              productId: item.productId,
              productName: item.product.name,
              oldPrice: item.priceAtAddInPesewas,
              newPrice: item.product.priceInPesewas,
            })) : null,
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
      
      // Check product exists and is active
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      
      if (!product || !product.isActive) {
        throw new ApiError(404, 'Product not found.');
      }
      
      // Check stock if tracking inventory
      if (product.trackInventory && product.stockQuantity < quantity && !product.allowBackorder) {
        throw new ApiError(400, `Only ${product.stockQuantity} items available in stock.`);
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
        const newQuantity = existingItem.quantity + quantity;
        
        // Check stock for new quantity
        if (product.trackInventory && product.stockQuantity < newQuantity && !product.allowBackorder) {
          throw new ApiError(400, `Only ${product.stockQuantity} items available in stock.`);
        }
        
        // Update quantity
        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          include: { product: true },
        });
      } else {
        // Create new item with price snapshot
        cartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
            priceAtAddInPesewas: product.priceInPesewas,
          },
          include: { product: true },
        });
      }
      
      // Update cart last activity
      await prisma.cart.update({
        where: { id: cart.id },
        data: { lastActivityAt: new Date() },
      });
      
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
        include: { cart: true, product: true },
      });
      
      if (!cartItem || cartItem.cart.userId !== req.user!.id) {
        throw new ApiError(404, 'Cart item not found.');
      }
      
      // Check stock
      if (cartItem.product.trackInventory && 
          cartItem.product.stockQuantity < quantity && 
          !cartItem.product.allowBackorder) {
        throw new ApiError(400, `Only ${cartItem.product.stockQuantity} items available in stock.`);
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
