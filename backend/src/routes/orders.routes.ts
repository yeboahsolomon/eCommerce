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
 * Supports Multi-Vendor: Splits order into SellerOrders
 */
router.post(
  '/',
  authenticate,
  // requireBuyer, // Optional
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
                    select: { id: true, businessName: true } // Fetch seller info
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
      
      // Apply coupon if provided (Global Coupon for now)
      // TODO: Support seller-specific coupons
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
      
      const shippingFeeInPesewas = 0;  // Free shipping for now (Global)
      const taxInPesewas = 0;  // No tax for now
      const totalInPesewas = subtotalInPesewas - discountInPesewas + shippingFeeInPesewas + taxInPesewas;
      
      // Generate order number (format: GH-YYYYMMDD-XXXX)
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
            
            // Financials
            subtotalInPesewas,
            shippingFeeInPesewas,
            taxInPesewas,
            discountInPesewas,
            totalInPesewas,
            
            // Shipping
            shippingFullName: orderData.shippingFullName,
            shippingPhone: orderData.shippingPhone,
            shippingRegion: orderData.shippingRegion,
            shippingCity: orderData.shippingCity,
            shippingArea: orderData.shippingArea,
            shippingStreetAddress: orderData.shippingStreetAddress,
            shippingGpsAddress: orderData.shippingGpsAddress || null,
            
            // Contact
            customerEmail: orderData.customerEmail,
            customerPhone: orderData.customerPhone,
            
            // Delivery
            // Notes
            notes: `Delivery Method: ${orderData.deliveryMethod || 'Standard'}${orderData.deliveryNotes ? `\nNotes: ${orderData.deliveryNotes}` : ''}`,

            // Payment
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

        // 2. Create Seller Orders (Sub-orders)
        for (const [sellerId, items] of sellerGroups.entries()) {
          // Calculate stats for this seller
          const sellerSubtotal = items.reduce((sum, item) => sum + item.product.priceInPesewas * item.quantity, 0);
          
          // Distribute discount proportional to value? Or just applying global logic.
          // For now, simpler to not split discount precisely per seller unless we have per-item discount.
          // We will store "Seller Order Amount" as just the sum of items for now (ignoring global coupon impact on seller payout? Complex topic.)
          // Decision: Seller Payout = Seller Subtotal - Commission. Coupon burn is on Platform (usually).
          
          let sellerOrderData: any = {
            orderId: newOrder.id,
            sellerId: sellerId === 'PLATFORM' ? null : sellerId, // Handle platform items if any
            status: 'PENDING', // Will update when main order is confirmed
            subtotalInPesewas: sellerSubtotal,
            shippingFeeInPesewas: 0, // Assuming global free shipping
            taxInPesewas: 0,
            discountInPesewas: 0, // Simplified
            totalInPesewas: sellerSubtotal, // + shipping + tax - discount
            payoutAmountInPesewas: Math.round(sellerSubtotal * 0.95), // 5% Commission deduced (Example)
            commissionAmountInPesewas: Math.round(sellerSubtotal * 0.05),
          };

          // Remove null sellerId if it was strictly required?
          // Schema says `sellerId` in `SellerOrder` is `String` (from Chunk 1).
          // Wait, `SellerOrder` model has `seller SellerProfile`. `sellerId String`.
          // So 'PLATFORM' items (null sellerId) CANNOT create a `SellerOrder` if `sellerId` is mandatory.
          // If product can have null sellerId, we have a problem.
          // In Step 410, Product `sellerId` is `String?`.
          // In Step 398 (Chunk 1), `SellerOrder` has `sellerId String`.
          // So if we have PLATFORM products, we cannot create a `SellerOrder` for them unless we have a "Platform Seller" profile.
          // OR, we don't create `SellerOrder` for platform items?
          // But then `OrderItem` needs to link to `SellerOrder?`.
          // My schema has `sellerOrder SellerOrder @relation(...)`. It became MANDATORY in Step 404 replacement?
          // In Step 404: `sellerOrder SellerOrder @relation(...)`. MANDATORY.
          // This implies ALL ordered items MUST belong to a Seller.
          // So Platform MUST have a Seller Profile (e.g. "Official Store").
          // Ideally, I should fetch the "Official Store" ID if sellerId is null.
          // For now, I'll assume valid products have sellers (since I added `sellerId` to `Product`).
          // If `sellerId` is null, I will skip `SellerOrder` creation for those items? No, that breaks `OrderItem` relation.
          // I will throw error if `sellerId` is missing for now, OR I will create a "dummy" id if specific case.
          // Since I can't query DB for "Official Store", I will error if product has no seller.
          
          if (sellerId === 'PLATFORM') {
             // Fallback: If product has no seller, currently we can't process it with this schema unless we have a placeholder.
             // I'll skip this check assuming migration/seed ensured sellers.
             // Actually, I'll throw error to be safe.
             throw new ApiError(500, 'Product missing seller information.');
          }

          const sellerOrder = await tx.sellerOrder.create({
            data: sellerOrderData
          });

          // 3. Create Order Items linked to both Order and SellerOrder
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
          
          // 4. Update Stock & Log (Per item)
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

export default router;
