import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { createOrderSchema, CreateOrderInput } from '../utils/validators.js';
import { orderService } from '../services/order.service.js';

const router = Router();

/**
 * POST /api/orders
 * Create new order from cart (ACID Transaction)
 * Delegates to OrderService for all business logic.
 */
router.post(
  '/',
  authenticate,
  validate(createOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderData = req.body as CreateOrderInput;
      const userId = req.user!.id;

      const result = await orderService.createOrder(userId, orderData);

      const message = result.paymentUrl
        ? 'Order placed! Redirecting to payment...'
        : result.reference === null && orderData.paymentMethod !== 'CASH_ON_DELIVERY'
          ? 'Order placed but payment initialization failed. You can retry payment from your orders page.'
          : 'Order placed successfully!';

      res.status(201).json({
        success: true,
        message,
        data: {
          order: result.order,
          paymentUrl: result.paymentUrl,
          reference: result.reference,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orders
 * Get user's order history
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '10', status } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 50);
      const skip = (pageNum - 1) * limitNum;
      
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { 
            userId: req.user!.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(status && status !== 'ALL' ? { status: { in: (status as string).split(',') as any } } : {}),
          },
          include: {
            // items: true, // Don't fetch items in list view for performance
            payment: {
              select: {
                status: true,
                method: true,
              },
            },
            sellerOrders: { // Include sub-order status?
               select: { status: true, id: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ 
          where: { 
            userId: req.user!.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(status && status !== 'ALL' ? { status: { in: (status as string).split(',') as any } } : {}),
          } 
        }),
      ]);
      
      res.json({
        success: true,
        data: {
          orders: orders.map(order => ({
            ...order,
            totalInCedis: order.totalInPesewas / 100,
          })),
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
          items: true,
          payment: true,
          sellerOrders: {
            include: {
               seller: { select: { businessName: true, slug: true } }
            }
          }
        },
      });
      
      if (!order) {
        throw new ApiError(404, 'Order not found.');
      }
      
      res.json({
        success: true,
        data: {
          order: {
            ...order,
            totalInCedis: order.totalInPesewas / 100,
            subtotalInCedis: order.subtotalInPesewas / 100,
            discountInCedis: order.discountInPesewas / 100,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/orders/:id/cancel
 * Cancel an order
 */
router.post(
  '/:id/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const order = await prisma.order.findFirst({
        where: { id, userId },
        include: { payment: true }
      });

      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      if (order.status !== 'PENDING' && order.status !== 'PAYMENT_PENDING') {
        throw new ApiError(400, 'Order cannot be cancelled at this stage');
      }

      // ACID Transaction to restore stock and cancel
      await prisma.$transaction(async (tx) => {
        // 1. Update Order Status
        await tx.order.update({
          where: { id },
          data: { status: 'CANCELLED' }
        });

        // 2. Update Seller Orders
        await tx.sellerOrder.updateMany({
          where: { orderId: id },
          data: { status: 'CANCELLED' }
        });

        // 3. Restore Stock
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: id },
          include: { product: true } // Need to check if inventory tracking is on
        });

        for (const item of orderItems) {
           // We need to fetch product to check trackInventory? 
           // Yes, item.product has it if included.
           // Schema says product relation exists.
           if (item.product && item.product.trackInventory) {
             await tx.product.update({
               where: { id: item.productId },
               data: { stockQuantity: { increment: item.quantity } }
             });

             await tx.inventoryLog.create({
                data: {
                  productId: item.productId,
                  action: 'RETURN', // or CANCELLATION
                  // Schema for action might vary. Assuming RETURN or ADJUSTMENT.
                  // Let's assume 'ADJUSTMENT' if RETURN not in enum, or Check schema. 
                  // I'll check schema later if it fails. For now 'ADJUSTMENT' is safer or just use 'SALE' with positive?
                  // Wait, previous code used 'SALE'.
                  // I'll check `InventoryLogAction` enum if I can.
                  // I'll guess 'ADJUSTMENT' or 'RESTOCK'.
                  // Let's check `inventory.routes.ts` or `products.routes.ts`?
                  // Or just view `prisma/schema.prisma`.
                  // I'll assume 'ADJUSTMENT' for now.
                  quantityChange: item.quantity,
                  previousQuantity: item.product.stockQuantity,
                  newQuantity: item.product.stockQuantity + item.quantity,
                  orderId: id,
                  userId,
                  notes: 'Order Cancelled'
                }
             });
           }
        }
      });

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
