import { request } from './client';
import type { Cart, WishlistItem } from '../../types';

export const cartApi = {
  async getCart() {
    return request<{ cart: Cart }>('GET', '/cart');
  },

  async addToCart(productId: string, quantity = 1, variantId?: string) {
    return request<{ cart: Cart }>('POST', '/cart/items', { productId, quantity, variantId });
  },

  async updateCartItem(itemId: string, quantity: number) {
    return request<{ cart: Cart }>('PUT', `/cart/items/${itemId}`, { quantity });
  },

  async removeFromCart(itemId: string) {
    return request<{ cart: Cart }>('DELETE', `/cart/items/${itemId}`);
  },

  async clearCart() {
    return request<{ cart: Cart }>('DELETE', '/cart');
  },

  async mergeCart(localCart: { items: { productId: string; quantity: number; variantId?: string; }[] }) {
    return request<{ cart: Cart }>('POST', '/cart/merge', { items: localCart.items });
  },
};

export const wishlistApi = {
  async getWishlist() {
    return request<{ items: WishlistItem[] }>('GET', '/wishlist');
  },

  async addToWishlist(productId: string, note?: string) {
    return request<{ id: string }>('POST', '/wishlist/items', { productId, note });
  },

  async removeFromWishlist(productId: string) {
    return request<void>('DELETE', `/wishlist/items/${productId}`);
  },

  async checkWishlist(productId: string) {
    return request<{ inWishlist: boolean }>('GET', `/wishlist/check/${productId}`);
  },

  async moveWishlistToCart() {
    return request<{ movedCount: number }>('POST', '/wishlist/move-to-cart');
  },
};
