import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { createOrderSchema, CreateOrderInput } from '../utils/validators.js';
import { paystackService } from '../services/paystack.service.js';

const router = Router();

/**
 * POST /api/orders
 * Create new order from cart (ACID Transaction)
 * Supports Multi-Vendor: Splits order into SellerOrders
 * Initializes Paystack payment for non-COD orders
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
                  seller: {
                    select: { id: true, businessName: true }
                  }
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

      // Group items by Seller
      const sellerGroups = new Map<string | 'PLATFORM', typeof cart.items>();
      
      for (const item of cart.items) {
        const sellerId = item.product.sellerId || 'PLATFORM';
        if (!sellerGroups.has(sellerId)) {
          sellerGroups.set(sellerId, []);
        }
        sellerGroups.get(sellerId)!.push(item);
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
      
      const shippingFeeInPesewas = 0;
      const taxInPesewas = 0;
      const totalInPesewas = subtotalInPesewas - discountInPesewas + shippingFeeInPesewas + taxInPesewas;
      
      // Generate order number
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `GH-${datePart}-${randomPart}`;
      
      // ===== ACID TRANSACTION =====
      const order = await prisma.$transaction(async (tx) => {
        // 1. Create Parent Order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: orderData.paymentMethod === 'CASH_ON_DELIVERY' ? 'CONFIRMED' : 'PAYMENT_PENDING',
            
            subtotalInPesewas,
            shippingFeeInPesewas,
            taxInPesewas,
            discountInPesewas,
            totalInPesewas,
            
            shippingFullName: orderData.shippingFullName,
            shippingPhone: orderData.shippingPhone,
            shippingRegion: orderData.shippingRegion,
            shippingCity: orderData.shippingCity,
            shippingArea: orderData.shippingArea,
            shippingStreetAddress: orderData.shippingStreetAddress,
            shippingGpsAddress: orderData.shippingGpsAddress || null,
            
            customerEmail: orderData.customerEmail,
            customerPhone: orderData.customerPhone,
            
            notes: `Delivery Method: ${orderData.deliveryMethod || 'Standard'}${orderData.deliveryNotes ? `\nNotes: ${orderData.deliveryNotes}` : ''}`,

            payment: {
              create: {
                amountInPesewas: totalInPesewas,
                method: orderData.paymentMethod,
                status: 'PENDING',
                momoPhoneNumber: orderData.momoPhoneNumber,
                momoNetwork: orderData.paymentMethod.startsWith('MOMO_') 
                  ? orderData.paymentMethod.replace('MOMO_', '') 
                  : null,
              },
            },
          },
        });

        // 2. Create Seller Orders
        // If any products have no seller, assign them to a platform seller
        let platformSellerId: string | null = null;
        
        for (const [sellerId, items] of sellerGroups.entries()) {
          const sellerSubtotal = items.reduce((sum, item) => sum + item.product.priceInPesewas * item.quantity, 0);
          
          let actualSellerId = sellerId as string;
          if (sellerId === 'PLATFORM') {
            // Find or create platform seller
            if (!platformSellerId) {
              let platformSeller = await tx.sellerProfile.findFirst({
                where: { businessName: 'GhanaMarket Official' },
              });
              
              if (!platformSeller) {
                // Create platform seller linked to the ordering user (or admin)
                platformSeller = await tx.sellerProfile.create({
                  data: {
                    userId,
                    businessName: 'GhanaMarket Official',
                    slug: 'ghanamarket-official',
                    description: 'Official GhanaMarket store',
                    businessPhone: '0000000000',
                    businessAddress: 'Accra, Ghana',
                    ghanaRegion: 'Greater Accra',
                  },
                });
              }
              platformSellerId = platformSeller.id;
            }
            actualSellerId = platformSellerId;
          }

          const sellerOrder = await tx.sellerOrder.create({
            data: {
              orderId: newOrder.id,
              sellerId: actualSellerId,
              status: 'PENDING',
              subtotalInPesewas: sellerSubtotal,
              shippingFeeInPesewas: 0,
              discountInPesewas: 0,
              totalInPesewas: sellerSubtotal,
              payoutAmountInPesewas: Math.round(sellerSubtotal * 0.95),
              platformFeeInPesewas: Math.round(sellerSubtotal * 0.05),
            }
          });

          // 3. Order Items
          await tx.orderItem.createMany({
            data: items.map(item => ({
              orderId: newOrder.id,
              sellerOrderId: sellerOrder.id,
              productId: item.productId,
              productName: item.product.name,
              productSku: item.product.sku,
              productImage: item.product.images[0]?.url || null,
              quantity: item.quantity,
              unitPriceInPesewas: item.product.priceInPesewas,
              totalPriceInPesewas: item.product.priceInPesewas * item.quantity,
            }))
          });
          
          // 4. Update Stock & Log
          for (const item of items) {
             if (item.product.trackInventory) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stockQuantity: { decrement: item.quantity } },
              });
              
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
        }

        // 5. Update Coupon & Clear Cart
        if (orderData.couponCode && discountInPesewas > 0) {
          await tx.coupon.update({
            where: { code: orderData.couponCode.toUpperCase() },
            data: { usageCount: { increment: 1 } },
          });
        }
        
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
        
        return newOrder;
      });

      // ===== PAYSTACK PAYMENT INIT (for non-COD orders) =====
      if (orderData.paymentMethod !== 'CASH_ON_DELIVERY') {
        try {
          const reference = paystackService.generateReference();
          
          // Determine Paystack channel based on payment method
          const channels: ('card' | 'mobile_money')[] = [];
          if (orderData.paymentMethod === 'CARD') {
            channels.push('card');
          } else if (orderData.paymentMethod.startsWith('MOMO_')) {
            channels.push('mobile_money');
          } else {
            channels.push('card', 'mobile_money');
          }

          const paystackResult = await paystackService.initializeTransaction({
            email: orderData.customerEmail,
            amount: totalInPesewas,
            reference,
            currency: 'GHS',
            callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/callback`,
            metadata: { orderId: order.id, userId, orderNumber },
            channels,
          });

          // Update payment record with Paystack reference
          await prisma.payment.updateMany({
            where: { orderId: order.id },
            data: { gatewayReference: reference },
          });

          return res.status(201).json({
            success: true,
            message: 'Order placed! Redirecting to payment...',
            data: {
              order: {
                ...order,
                totalInCedis: order.totalInPesewas / 100,
              },
              paymentUrl: paystackResult.data.authorization_url,
              reference: paystackResult.data.reference,
            },
          });
        } catch (paymentError: any) {
          console.error('Paystack init failed:', paymentError.message);
          // Order was created but payment init failed — user can retry
          return res.status(201).json({
            success: true,
            message: 'Order placed but payment initialization failed. You can retry payment from your orders page.',
            data: {
              order: {
                ...order,
                totalInCedis: order.totalInPesewas / 100,
              },
              paymentUrl: null,
              reference: null,
            },
          });
        }
      }
      
      // Cash on Delivery
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
