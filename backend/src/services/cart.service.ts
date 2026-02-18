
import prisma from '../config/database.js';
import { redisService } from './redis.service.js';

const GUEST_CART_TTL = 60 * 60 * 24 * 7; // 7 days

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export class CartService {
  
  /**
   * Add item to cart (Guest or Auth)
   */
  async addItem(userId: string | null, sessionId: string, item: CartItemInput) {
    if (userId) {
      return this.addItemToDb(userId, item);
    } else {
      return this.addItemToRedis(sessionId, item);
    }
  }

  /**
   * Get cart (Guest or Auth)
   */
  async getCart(userId: string | null, sessionId: string) {
    if (userId) {
      return this.getDbCart(userId);
    } else {
      return this.getRedisCart(sessionId);
    }
  }

  /**
   * Update item quantity
   */
  async updateItem(userId: string | null, sessionId: string, productId: string, quantity: number) {
    if (userId) {
        // DB logic handled in controller usually, but can be here
        // For now, controller does direct DB access. I should refactor to use this service?
        // Let's keep controller logic for DB for now to avoid refactoring everything, 
        // OR move DB logic here. Moving here is better for "Hybrid" abstraction.
        // But `cart.routes.ts` already has DB logic. 
        // I will implement DB helpers here and update controller to use them.
        return this.updateDbItem(userId, productId, quantity);
    } else {
        return this.updateRedisItem(sessionId, productId, quantity);
    }
  }

  /**
   * Remove item
   */
  async removeItem(userId: string | null, sessionId: string, productId: string) {
    if (userId) {
        return this.removeDbItem(userId, productId);
    } else {
        return this.removeRedisItem(sessionId, productId);
    }
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string | null, sessionId: string) {
    if (userId) {
        return this.clearDbCart(userId);
    } else {
        return this.clearRedisCart(sessionId);
    }
  }

  /**
   * Merge Redis cart into DB cart on login
   */
  async mergeCarts(userId: string, sessionId: string) {
    const guestCart = await this.getRedisCart(sessionId);
    if (!guestCart || guestCart.items.length === 0) return;

    // Get Auth Cart
    let dbCart = await prisma.cart.findUnique({ where: { userId } });
    if (!dbCart) {
        dbCart = await prisma.cart.create({ data: { userId } });
    }

    // Merge items
    for (const guestItem of guestCart.items) {
        const existingItem = await prisma.cartItem.findUnique({
            where: { cartId_productId: { cartId: dbCart.id, productId: guestItem.productId } }
        });

        if (existingItem) {
            // Update quantity
            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + guestItem.quantity }
            });
        } else {
            // Create new
            await prisma.cartItem.create({
                data: {
                    cartId: dbCart.id,
                    productId: guestItem.productId,
                    quantity: guestItem.quantity,
                    priceAtAddInPesewas: guestItem.price,
                }
            });
        }
    }

    // Clear Redis cart
    await this.clearRedisCart(sessionId);
  }

  // ================= PRIVATE HELPERS =================

  private async getRedisCart(sessionId: string) {
    const key = `cart:guest:${sessionId}`;
    const cart = await redisService.get<any>(key);
    
    // If cart exists, enrich with product details from DB (names, images, prices)
    // because Redis only stores minimal data or potentially stale data.
    // Actually, storing minimal data (id, qty) in Redis is better, and fetching details on read.
    if (!cart) return { items: [] };

    // Fetch product details for current prices/stock
    const productIds = cart.items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
            id: true, name: true, slug: true, priceInPesewas: true, 
            stockQuantity: true, isActive: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } }
        }
    });

    // Map content
    const enrichedItems = cart.items.map((item: any) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return null; // Product deleted?
        return {
            ...item,
            product: {
                ...product,
                priceInCedis: product.priceInPesewas / 100,
                image: product.images[0]?.url
            },
            totalPrice: (product.priceInPesewas * item.quantity) / 100
        };
    }).filter(Boolean);

    // Calculate totals
    const total = enrichedItems.reduce((sum: number, i: any) => sum + i.totalPrice, 0);

    return { items: enrichedItems, total };
  }

  private async addItemToRedis(sessionId: string, item: CartItemInput) {
    const key = `cart:guest:${sessionId}`;
    let cart = await redisService.get<any>(key) || { items: [] };
    
    const existingIndex = cart.items.findIndex((i: any) => i.productId === item.productId);
    if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += item.quantity;
    } else {
        // Fetch price for snapshot? Optional for guest, but good for consistency
        cart.items.push({ productId: item.productId, quantity: item.quantity, addedAt: new Date() });
    }
    
    await redisService.set(key, cart, GUEST_CART_TTL);
    return this.getRedisCart(sessionId);
  }

  private async updateRedisItem(sessionId: string, productId: string, quantity: number) {
    const key = `cart:guest:${sessionId}`;
    let cart = await redisService.get<any>(key);
    if (!cart) return null;

    const index = cart.items.findIndex((i: any) => i.productId === productId);
    if (index >= 0) {
        if (quantity > 0) {
            cart.items[index].quantity = quantity;
        } else {
            cart.items.splice(index, 1);
        }
        await redisService.set(key, cart, GUEST_CART_TTL);
    }
    return this.getRedisCart(sessionId);
  }

  private async removeRedisItem(sessionId: string, productId: string) {
    return this.updateRedisItem(sessionId, productId, 0);
  }

  private async clearRedisCart(sessionId: string) {
    await redisService.del(`cart:guest:${sessionId}`);
  }

  // --- DB Helpers (Reusing existing logic logic but encapsulated) ---

  private async getDbCart(userId: string) {
     return prisma.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: {
                    product: {
                        include: { images: { where: { isPrimary: true }, take: 1 } }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
     });
  }

  private async addItemToDb(userId: string, item: CartItemInput) {
     // Check product validity first (controller should handle? or service?)
     // Service should handle business logic.
     const product = await prisma.product.findUnique({ where: { id: item.productId } });
     if (!product) throw new Error("Product not found");

     let cart = await prisma.cart.findUnique({ where: { userId } });
     if (!cart) cart = await prisma.cart.create({ data: { userId } });

     const existing = await prisma.cartItem.findUnique({
         where: { cartId_productId: { cartId: cart.id, productId: item.productId } }
     });

     if (existing) {
         return prisma.cartItem.update({
             where: { id: existing.id },
             data: { quantity: existing.quantity + item.quantity }
         });
     } else {
         return prisma.cartItem.create({
             data: {
                 cartId: cart.id,
                 productId: item.productId,
                 quantity: item.quantity,
                 priceAtAddInPesewas: product.priceInPesewas
             }
         });
     }
  }

  private async updateDbItem(userId: string, productId: string, quantity: number) {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) return null;

      // We need cartItemId, but we assume we find by productId for consistency
      const item = await prisma.cartItem.findUnique({
          where: { cartId_productId: { cartId: cart.id, productId } }
      });
      if (!item) return null;

      return prisma.cartItem.update({
          where: { id: item.id },
          data: { quantity }
      });
  }

  private async removeDbItem(userId: string, productId: string) {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) return;
      await prisma.cartItem.deleteMany({
          where: { cartId: cart.id, productId }
      });
  }

  private async clearDbCart(userId: string) {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) return;
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

}

export const cartService = new CartService();
