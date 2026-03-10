
import prisma from '../config/database.js';
import { redisService } from './redis.service.js';
import crypto from 'crypto';

const GUEST_CART_TTL = 60 * 60 * 24 * 7; // 7 days

export interface CartItemInput {
  productId: string;
  variantId?: string;
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
  async updateItem(userId: string | null, sessionId: string, cartItemId: string, quantity: number) {
    if (userId) {
        return this.updateDbItem(userId, cartItemId, quantity);
    } else {
        return this.updateRedisItem(sessionId, cartItemId, quantity);
    }
  }

  /**
   * Remove item
   */
  async removeItem(userId: string | null, sessionId: string, cartItemId: string) {
    if (userId) {
        return this.removeDbItem(userId, cartItemId);
    } else {
        return this.removeRedisItem(sessionId, cartItemId);
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
        const existingItem = await prisma.cartItem.findFirst({
            where: { cartId: dbCart.id, productId: guestItem.productId, variantId: guestItem.variantId || null }
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
                    variantId: guestItem.variantId || null,
                    quantity: guestItem.quantity,
                    priceAtAddInPesewas: guestItem.price || 0,
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
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            variants: true
        }
    });

    // Map content
    const enrichedItems = cart.items.map((item: any) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return null; // Product deleted?
        
        let variant = null;
        if (item.variantId && product.variants) {
           variant = product.variants.find((v: any) => v.id === item.variantId);
        }
        
        const price = variant && variant.priceInPesewas ? variant.priceInPesewas : product.priceInPesewas;
        
        return {
            ...item,
            id: item.id || crypto.randomUUID(),
            product: {
                ...product,
                priceInCedis: product.priceInPesewas / 100,
                image: product.images[0]?.url,
            },
            variant: variant ? { ...variant, priceInCedis: variant.priceInPesewas ? variant.priceInPesewas / 100 : undefined } : null,
            totalPrice: (price * item.quantity) / 100
        };
    }).filter(Boolean);

    // Calculate totals
    const total = enrichedItems.reduce((sum: number, i: any) => sum + i.totalPrice, 0);

    return { items: enrichedItems, total };
  }

  private async addItemToRedis(sessionId: string, item: CartItemInput) {
    const key = `cart:guest:${sessionId}`;
    let cart = await redisService.get<any>(key) || { items: [] };
    
    // Ensure all items have IDs retroactively if updating legacy session
    cart.items.forEach((i: any) => { if (!i.id) i.id = crypto.randomUUID(); });
    
    const existingIndex = cart.items.findIndex((i: any) => i.productId === item.productId && i.variantId === item.variantId);
    if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += item.quantity;
    } else {
        cart.items.push({ 
            id: crypto.randomUUID(), 
            productId: item.productId, 
            variantId: item.variantId || null, 
            quantity: item.quantity, 
            addedAt: new Date() 
        });
    }
    
    await redisService.set(key, cart, GUEST_CART_TTL);
    return this.getRedisCart(sessionId);
  }

  private async updateRedisItem(sessionId: string, cartItemId: string, quantity: number) {
    const key = `cart:guest:${sessionId}`;
    let cart = await redisService.get<any>(key);
    if (!cart) return null;

    const index = cart.items.findIndex((i: any) => i.id === cartItemId || i.productId === cartItemId);
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

  private async removeRedisItem(sessionId: string, cartItemId: string) {
    return this.updateRedisItem(sessionId, cartItemId, 0);
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
     const product = await prisma.product.findUnique({ where: { id: item.productId } });
     if (!product) throw new Error("Product not found");

     let cart = await prisma.cart.findUnique({ where: { userId } });
     if (!cart) cart = await prisma.cart.create({ data: { userId } });
     else await prisma.cart.update({ where: { id: cart.id }, data: { lastActivityAt: new Date() } });

     const existingItem = await prisma.cartItem.findFirst({
         where: { cartId: cart.id, productId: item.productId, variantId: item.variantId || null }
     });

     if (existingItem) {
          await prisma.cartItem.update({
              where: { id: existingItem.id },
              data: { quantity: { increment: item.quantity } }
          });
     } else {
          await prisma.cartItem.create({
              data: {
                  cartId: cart.id,
                  productId: item.productId,
                  variantId: item.variantId || null,
                  quantity: item.quantity,
                  priceAtAddInPesewas: product.priceInPesewas
              }
          });
     }
     
     return this.getDbCart(userId);
  }

  private async updateDbItem(userId: string, cartItemId: string, quantity: number) {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) return null;

      const item = await prisma.cartItem.findFirst({
          where: { OR: [ { id: cartItemId }, { productId: cartItemId } ], cartId: cart.id }
      });
      if (!item) return null;

      await prisma.$transaction([
          prisma.cartItem.update({
              where: { id: item.id },
              data: { quantity }
          }),
          prisma.cart.update({
              where: { id: cart.id },
              data: { lastActivityAt: new Date() }
          })
      ]);
      return this.getDbCart(userId);
  }

  private async removeDbItem(userId: string, cartItemId: string) {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) return;

      const item = await prisma.cartItem.findFirst({
          where: { OR: [ { id: cartItemId }, { productId: cartItemId } ], cartId: cart.id }
      });
      
      if (item) {
          await prisma.$transaction([
              prisma.cartItem.delete({
                  where: { id: item.id }
              }),
              prisma.cart.update({
                  where: { id: cart.id },
                  data: { lastActivityAt: new Date() }
              })
          ]);
      }
      return this.getDbCart(userId);
  }

  private async clearDbCart(userId: string) {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) return;
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      return this.getDbCart(userId);
  }

}

export const cartService = new CartService();
