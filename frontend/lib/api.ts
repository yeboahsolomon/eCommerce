/**
 * Backward-compatible API facade.
 *
 * New code should import domain-specific modules directly:
 *   import { authApi } from '@/lib/api/auth'
 *   import { productsApi } from '@/lib/api/products'
 *
 * This file re-composes all domain modules into the legacy `api` object
 * so existing call sites (`api.login(...)`) continue to work.
 */

// Re-export shared types so `import { ApiResponse } from '@/lib/api'` still works.
export type { ApiResponse, PaginatedResponse } from './api/client';
export { request } from './api/client';

import { authApi } from './api/auth';
import { productsApi, categoriesApi } from './api/products';
import { cartApi, wishlistApi } from './api/cart';
import { ordersApi, paymentsApi, addressesApi } from './api/orders';
import { reviewsApi, searchApi, uploadsApi } from './api/search';
import { adminApi } from './api/admin';
import { sellerApi } from './api/seller';
import { request } from './api/client';

export const api = {
  request,

  // Auth
  ...authApi,
  // Products
  ...productsApi,
  // Categories
  ...categoriesApi,
  // Cart
  ...cartApi,
  // Wishlist
  ...wishlistApi,
  // Orders
  ...ordersApi,
  // Payments
  ...paymentsApi,
  // Addresses
  ...addressesApi,
  // Reviews
  ...reviewsApi,
  // Search
  ...searchApi,
  // Uploads
  ...uploadsApi,
  // Admin
  ...adminApi,
  // Seller
  ...sellerApi,
};

export default api;
