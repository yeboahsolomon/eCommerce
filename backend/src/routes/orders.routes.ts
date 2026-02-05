import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { createOrderSchema, CreateOrderInput } from '../utils/validators.js';

const router = Router();

/**
 * POST /api/orders
 * Create new order from cart (ACID Transaction)
 */
router.post(
  '/',
  authenticate,
  validate(createOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderData = req.body as CreateOrderInput;
      const userId = req.user!.id;
      
      // Get user's cart with items
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });
      
      if (!cart || cart.items.length === 0) {
        throw new ApiError(400, 'Your cart is empty. Add items before checkout.');
      }
      
      // Verify all products are active and in stock
      for (const item of cart.items) {
        if (!item.product.isActive) {
          throw new ApiError(400, `"${item.product.name}" is no longer available.`);
        }
        
        if (item.product.trackInventory && 
            item.product.stockQuantity < item.quantity && 
            !item.product.allowBackorder) {
          throw new ApiError(400, `"${item.product.name}" only has ${item.product.stockQuantity} items in stock.`);
        }
      }
      
      // Calculate totals (in pesewas)
      const subtotalInPesewas = cart.items.reduce(
        (sum, item) => sum + item.product.priceInPesewas * item.quantity,
        0
      );
      
      // Apply coupon if provided
      let discountInPesewas = 0;
      if (orderData.couponCode) {
        const coupon = await prisma.coupon.findUnique({
          where: { code: orderData.couponCode.toUpperCase() },
        });
        
        if (coupon && coupon.isActive) {
          const now = new Date();
          if (coupon.expiresAt && coupon.expiresAt < now) {
            throw new ApiError(400, 'This coupon has expired.');
          }
          if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            throw new ApiError(400, 'This coupon has reached its usage limit.');
          }
          if (coupon.minOrderInPesewas && subtotalInPesewas < coupon.minOrderInPesewas) {
            throw new ApiError(400, `Minimum order of ₵${(coupon.minOrderInPesewas / 100).toFixed(2)} required for this coupon.`);
          }
          
          if (coupon.discountType === 'percentage') {
            discountInPesewas = Math.round(subtotalInPesewas * coupon.discountValue / 100);
            if (coupon.maxDiscountInPesewas) {
              discountInPesewas = Math.min(discountInPesewas, coupon.maxDiscountInPesewas);
            }
          } else {
            discountInPesewas = coupon.discountValue;
          }
        }
      }
      
      const shippingFeeInPesewas = 0;  // Free shipping for now
      const taxInPesewas = 0;  // No tax for now
      const totalInPesewas = subtotalInPesewas - discountInPesewas + shippingFeeInPesewas + taxInPesewas;
      
      // Generate order number (format: GH-YYYYMMDD-XXXX)
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `GH-${datePart}-${randomPart}`;
      
      // ===== ACID TRANSACTION =====
      // All of these operations succeed or fail together
      const order = await prisma.$transaction(async (tx) => {
        // 1. Create the order with SNAPSHOT data
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: orderData.paymentMethod === 'CASH_ON_DELIVERY' ? 'CONFIRMED' : 'PAYMENT_PENDING',
            
            // Financial snapshot (immutable)
            subtotalInPesewas,
            shippingFeeInPesewas,
            taxInPesewas,
            discountInPesewas,
            totalInPesewas,
            
            // Shipping address snapshot
            shippingFullName: orderData.shippingFullName,
            shippingPhone: orderData.shippingPhone,
            shippingRegion: orderData.shippingRegion,
            shippingCity: orderData.shippingCity,
            shippingArea: orderData.shippingArea,
            shippingStreetAddress: orderData.shippingStreetAddress,
            shippingGpsAddress: orderData.shippingGpsAddress || null,
            
            // Contact snapshot
            customerEmail: orderData.customerEmail,
            customerPhone: orderData.customerPhone,
            
            // Delivery
            deliveryMethod: orderData.deliveryMethod,
            deliveryNotes: orderData.deliveryNotes,
            
            // Order items with PRICE SNAPSHOT
            items: {
              create: cart.items.map(item => ({
                productId: item.productId,
                productName: item.product.name,       // Snapshot
                productSku: item.product.sku,         // Snapshot
                productImage: item.product.images[0]?.url || null,  // Snapshot
                quantity: item.quantity,
                unitPriceInPesewas: item.product.priceInPesewas,  // Snapshot!
                totalPriceInPesewas: item.product.priceInPesewas * item.quantity,
              })),
            },
            
            // Create payment record
            payment: {
              create: {
                amountInPesewas: totalInPesewas,
                method: orderData.paymentMethod,
                status: orderData.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PENDING',
                momoPhoneNumber: orderData.momoPhoneNumber,
                momoNetwork: orderData.paymentMethod.startsWith('MOMO_') 
                  ? orderData.paymentMethod.replace('MOMO_', '') 
                  : null,
              },
            },
          },
          include: {
            items: true,
            payment: true,
          },
        });
        
        // 2. Decrease stock for each item (inventory concurrency)
        for (const item of cart.items) {
          if (item.product.trackInventory) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
            
            // Log inventory change
            await tx.inventoryLog.create({
              data: {
                productId: item.productId,
                action: 'SALE',
                quantityChange: -item.quantity,
                previousQuantity: item.product.stockQuantity,
                newQuantity: item.product.stockQuantity - item.quantity,
                orderId: newOrder.id,
                userId,
              },
            });
          }
        }
        
        // 3. Increment coupon usage if used
        if (orderData.couponCode && discountInPesewas > 0) {
          await tx.coupon.update({
            where: { code: orderData.couponCode.toUpperCase() },
            data: { usageCount: { increment: 1 } },
          });
        }
        
        // 4. Clear the cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
        
        return newOrder;
      });
      
      res.status(201).json({
        success: true,
        message: 'Order placed successfully!',
        data: {
          order: {
            ...order,
            totalInCedis: order.totalInPesewas / 100,
          },
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
      const { page = '1', limit = '10' } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 50);
      const skip = (pageNum - 1) * limitNum;
      
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { userId: req.user!.id },
          include: {
            items: true,
            payment: {
              select: {
                status: true,
                method: true,
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

export default router;
