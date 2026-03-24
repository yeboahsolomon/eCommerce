// Barrel re-exports for domain API modules
export type { ApiResponse, PaginatedResponse } from './client';
export { request } from './client';
export { authApi } from './auth';
export { productsApi, categoriesApi } from './products';
export { cartApi, wishlistApi } from './cart';
export { ordersApi, paymentsApi, addressesApi } from './orders';
export { reviewsApi, searchApi, uploadsApi } from './search';
export { adminApi } from './admin';
export { sellerApi } from './seller';
