import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { createOrderSchema, CreateOrderInput } from '../utils/validators.js';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

/**
 * POST /api/orders
 * Create new order from cart or direct checkout
 */
router.post(
  '/',
  authenticate,
  validate(createOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderData = req.body as CreateOrderInput;
      const userId = req.user!.id;
      
      // Get user's cart
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
      
      if (!cart || cart.items.length === 0) {
        throw new ApiError(400, 'Your cart is empty. Add items before checkout.');
      }
      
      // Verify all products are in stock
      const outOfStockItems = cart.items.filter(item => !item.product.inStock);
      if (outOfStockItems.length > 0) {
        throw new ApiError(400, `Some items are out of stock: ${outOfStockItems.map(i => i.product.name).join(', ')}`);
      }
      
      // Calculate totals
      const subtotal = cart.items.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0
      );
      const deliveryFee = 0; // Free delivery for now
      const total = subtotal + deliveryFee;
      
      // Generate order number (simple format: GH-YYYYMMDD-XXXX)
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `GH-${datePart}-${randomPart}`;
      
      // Create order with transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: 'PENDING',
            subtotal: new Decimal(subtotal),
            deliveryFee: new Decimal(deliveryFee),
            total: new Decimal(total),
            paymentMethod: orderData.paymentMethod,
            shippingAddress: {
              region: orderData.region,
              city: orderData.city,
              address: orderData.address,
              gpsAddress: orderData.gpsAddress || null,
            },
            contactName: orderData.fullName,
            contactEmail: orderData.email,
            contactPhone: orderData.phone,
            items: {
              create: cart.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.product.price,
              })),
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        });
        
        // Clear the cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
        
        return newOrder;
      });
      
      res.status(201).json({
        success: true,
        message: 'Order placed successfully!',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orders
 * Get user's orders
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '10' } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 50);
      const skip = (pageNum - 1) * limitNum;
      
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { userId: req.user!.id },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ where: { userId: req.user!.id } }),
      ]);
      
      res.json({
        success: true,
        data: {
          orders,
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
 * GET /api/orders/:id
 * Get single order details
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { id, userId: req.user!.id },
            { orderNumber: id, userId: req.user!.id },
          ],
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
      
      if (!order) {
        throw new ApiError(404, 'Order not found.');
      }
      
      res.json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
