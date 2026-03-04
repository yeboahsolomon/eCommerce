/**
 * Order Service — Consolidated order creation logic
 *
 * Replaces the duplicate ACID-transaction code that lived in both
 * orders.routes.ts and checkout.routes.ts.  Every order goes through
 * this single service ensuring:
 *   • Real delivery-fee calculation (via DeliveryService)
 *   • Collision-safe order-number generation (crypto.randomBytes)
 *   • Inventory tracking + audit logging
 *   • Platform-seller fallback for un-owned products
 *   • Coupon validation & application
 *   • Paystack payment initialisation for non-COD orders
 *   • Order-confirmation email trigger
 */

import crypto from 'crypto';
import prisma from '../config/database.js';
import { ApiError } from '../middleware/error.middleware.js';
import { deliveryService } from './delivery.service.js';
import { paystackService } from './paystack.service.js';
import { emailService } from './email.service.js';
import { CreateOrderInput } from '../utils/validators.js';

// ━━━━━━━━━━━━━━━━━━━━━━ Types ━━━━━━━━━━━━━━━━━━━━━━

export interface CreateOrderResult {
  order: any;
  paymentUrl: string | null;
  reference: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━ Helpers ━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generate a collision-safe order number.
 * Format: GH-YYYYMMDD-XXXXXX  (6 hex chars → 16.7 M values/day)
 */
function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars
  return `GH-${datePart}-${randomPart}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━ Service ━━━━━━━━━━━━━━━━━━━━━━

class OrderService {
  /**
   * Create a new order from the authenticated user's cart.
   * This is the *only* place where orders are born.
   */
  async createOrder(
    userId: string,
    orderData: CreateOrderInput,
  ): Promise<CreateOrderResult> {
    // ────────── 1. Load & validate cart ──────────

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                seller: {
                  select: {
                    id: true,
                    businessName: true,
                    ghanaRegion: true,
                    businessAddress: true,
                    commissionRate: true,
                  },
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

    // Stock & availability checks
    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new ApiError(400, `"${item.product.name}" is no longer available.`);
      }
      if (
        item.product.trackInventory &&
        item.product.stockQuantity < item.quantity &&
        !item.product.allowBackorder
      ) {
        throw new ApiError(
          400,
          `"${item.product.name}" only has ${item.product.stockQuantity} items in stock.`,
        );
      }
    }

    // ────────── 2. Group items by seller ──────────

    type CartItemWithProduct = (typeof cart.items)[number];
    const sellerGroups = new Map<
      string,
      { items: CartItemWithProduct[]; seller: any; shippingFee: number }
    >();

    for (const item of cart.items) {
      const sellerId = item.product.sellerId || 'PLATFORM';
      if (!sellerGroups.has(sellerId)) {
        sellerGroups.set(sellerId, {
          items: [],
          seller: item.product.seller,
          shippingFee: 0,
        });
      }
      sellerGroups.get(sellerId)!.items.push(item);
    }

    // ────────── 3. Calculate delivery fees per seller ──────────

    let totalShippingFeeInPesewas = 0;

    for (const [, group] of sellerGroups) {
      const fee = deliveryService.calculateFee(
        group.seller?.ghanaRegion || null,
        group.seller?.businessAddress || null,
        orderData.shippingRegion,
        orderData.shippingCity,
      );
      group.shippingFee = fee;
      totalShippingFeeInPesewas += fee;
    }

    // ────────── 4. Subtotals ──────────

    const subtotalInPesewas = cart.items.reduce(
      (sum, item) => sum + item.product.priceInPesewas * item.quantity,
      0,
    );

    // ────────── 5. Coupon ──────────

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
          throw new ApiError(
            400,
            `Minimum order of ₵${(coupon.minOrderInPesewas / 100).toFixed(2)} required for this coupon.`,
          );
        }

        if (coupon.discountType === 'percentage') {
          discountInPesewas = Math.round(
            (subtotalInPesewas * coupon.discountValue) / 100,
          );
          if (coupon.maxDiscountInPesewas) {
            discountInPesewas = Math.min(discountInPesewas, coupon.maxDiscountInPesewas);
          }
        } else {
          discountInPesewas = coupon.discountValue;
        }
      }
    }

    const taxInPesewas = 0; // Tax engine placeholder
    const totalInPesewas =
      subtotalInPesewas - discountInPesewas + totalShippingFeeInPesewas + taxInPesewas;

    // ────────── 6. Generate order number ──────────

    const orderNumber = generateOrderNumber();

    // ────────── 7. ACID transaction ──────────

    const order = await prisma.$transaction(
      async (tx) => {
        // 7a. Create parent Order + Payment
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status:
              orderData.paymentMethod === 'CASH_ON_DELIVERY'
                ? 'CONFIRMED'
                : 'PAYMENT_PENDING',

            subtotalInPesewas,
            shippingFeeInPesewas: totalShippingFeeInPesewas,
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

            notes: `Delivery Method: ${orderData.deliveryMethod || 'Standard'}${
              orderData.deliveryNotes ? `\nNotes: ${orderData.deliveryNotes}` : ''
            }`,

            payment: {
              create: {
                amountInPesewas: totalInPesewas,
                method: orderData.paymentMethod,
                status: 'PENDING',
                momoPhoneNumber: orderData.momoPhoneNumber || null,
                momoNetwork: orderData.paymentMethod.startsWith('MOMO_')
                  ? orderData.paymentMethod.replace('MOMO_', '')
                  : null,
              },
            },
          },
        });

        // 7b. Create Seller Orders
        let platformSellerId: string | null = null;

        for (const [sellerId, group] of sellerGroups.entries()) {
          const sellerSubtotal = group.items.reduce(
            (sum, item) => sum + item.product.priceInPesewas * item.quantity,
            0,
          );

          // Resolve actual seller ID (create platform seller fallback if needed)
          let actualSellerId = sellerId;
          if (sellerId === 'PLATFORM') {
            if (!platformSellerId) {
              let platformSeller = await tx.sellerProfile.findFirst({
                where: { businessName: 'GhanaMarket Official' },
              });
              if (!platformSeller) {
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

          // Commission: use per-seller rate if set, else default 5%
          const commissionRate = group.seller?.commissionRate
            ? Number(group.seller.commissionRate)
            : 5;
          const platformFee = Math.round((sellerSubtotal * commissionRate) / 100);
          const payoutAmount = sellerSubtotal - platformFee;

          const sellerOrder = await tx.sellerOrder.create({
            data: {
              orderId: newOrder.id,
              sellerId: actualSellerId,
              status: 'PENDING',
              subtotalInPesewas: sellerSubtotal,
              shippingFeeInPesewas: group.shippingFee,
              discountInPesewas: 0,
              totalInPesewas: sellerSubtotal + group.shippingFee,
              platformFeeInPesewas: platformFee,
              payoutAmountInPesewas: payoutAmount,
            },
          });

          // 7c. Order Items
          await tx.orderItem.createMany({
            data: group.items.map((item) => ({
              orderId: newOrder.id,
              sellerOrderId: sellerOrder.id,
              productId: item.productId,
              productName: item.product.name,
              productSku: item.product.sku || null,
              productImage: item.product.images[0]?.url || null,
              quantity: item.quantity,
              unitPriceInPesewas: item.product.priceInPesewas,
              totalPriceInPesewas: item.product.priceInPesewas * item.quantity,
            })),
          });

          // 7d. Inventory deduction + audit log
          for (const item of group.items) {
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

        // 7e. Increment coupon usage
        if (orderData.couponCode && discountInPesewas > 0) {
          await tx.coupon.update({
            where: { code: orderData.couponCode.toUpperCase() },
            data: { usageCount: { increment: 1 } },
          });
        }

        // 7f. Clear cart
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return newOrder;
      },
      { timeout: 15000 },
    );

    // ────────── 8. Paystack payment init (non-COD) ──────────

    let paymentUrl: string | null = null;
    let reference: string | null = null;

    if (orderData.paymentMethod !== 'CASH_ON_DELIVERY') {
      try {
        reference = paystackService.generateReference();

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

        // Persist gateway reference
        await prisma.payment.updateMany({
          where: { orderId: order.id },
          data: {
            gatewayProvider: 'paystack',
            gatewayReference: reference,
          },
        });

        paymentUrl = paystackResult.data.authorization_url;
        reference = paystackResult.data.reference;
      } catch (paymentError: any) {
        console.error('Paystack init failed:', paymentError.message);
        // Order exists — user can retry payment from orders page
      }
    }

    // ────────── 9. Send order confirmation email (non-blocking) ──────────

    this.sendOrderConfirmation(order, orderData, cart.items, totalShippingFeeInPesewas).catch(
      (err) => console.error('Order confirmation email failed:', err),
    );

    return {
      order: { ...order, totalInCedis: order.totalInPesewas / 100 },
      paymentUrl,
      reference,
    };
  }

  // ━━━━━━━━ Private helpers ━━━━━━━━

  private async sendOrderConfirmation(
    order: any,
    orderData: CreateOrderInput,
    cartItems: any[],
    totalShipping: number,
  ): Promise<void> {
    const items = cartItems.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      price: `₵${((item.product.priceInPesewas * item.quantity) / 100).toFixed(2)}`,
      image: item.product.images?.[0]?.url || undefined,
      sellerName: item.product.seller?.businessName || 'GhanaMarket',
    }));

    await emailService.sendOrderConfirmationEmail({
      to: orderData.customerEmail,
      customerName: orderData.shippingFullName,
      orderNumber: order.orderNumber,
      orderDate: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Africa/Accra',
      }),
      totalAmount: `₵${(order.totalInPesewas / 100).toFixed(2)}`,
      subtotal: `₵${(order.subtotalInPesewas / 100).toFixed(2)}`,
      shippingFee: `₵${(totalShipping / 100).toFixed(2)}`,
      paymentMethod: orderData.paymentMethod,
      paymentStatus:
        orderData.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : 'Pending',
      items,
      deliveryName: orderData.shippingFullName,
      deliveryAddress: orderData.shippingStreetAddress,
      deliveryCity: orderData.shippingCity,
      deliveryRegion: orderData.shippingRegion,
      deliveryPhone: orderData.shippingPhone,
    });
  }
}

export const orderService = new OrderService();
