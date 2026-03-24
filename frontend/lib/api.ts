<<<<<<< HEAD
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
=======
import { axiosInstance } from './axios';
import {
  User,
  Category,
  Product,
  Cart,
  WishlistItem,
  Order,
  Address,
  RegisterData,
  CreateOrderInput,
  CreateAddressInput,
  ProductQueryParams,
  Review,
  ReviewSummary,
  SearchResult,
  SearchSuggestion,
  Pagination,
} from '../types';

// ==================== TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { message: string; path: string[] }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// ==================== HELPER ====================

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  config?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await axiosInstance({
      method,
      url,
      data,
      ...config,
    });

    return response.data;
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Handle error response from backend
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || error.response.data.error?.message || 'An error occurred',
        errors: error.response.data.error?.details,
      };
    }

    return {
      success: false,
      message: error.message || 'Network error. Please check your connection.',
    };
  }
}

// ==================== API OBJECT ====================
>>>>>>> 8cce350c8841ec0f588351af62f12ab683f7ff00

export const api = {
  request,

<<<<<<< HEAD
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
=======
  // ==================== AUTH ====================
  
  async register(data: RegisterData) {
    return request<{ user: User; token: string }>('POST', '/auth/register', data);
  },

  async login(email: string, password: string, rememberMe?: boolean) {
    return request<{ user: User; token: string }>('POST', '/auth/login', { email, password, rememberMe });
  },

  async googleLogin(credential: string) {
    return request<{ user: User; token: string }>('POST', '/auth/google', { credential });
  },

  async logout() {
    return request<null>('POST', '/auth/logout');
  },

  async resendVerification() {
    return request<null>('POST', '/auth/resend-verification');
  },

  async getProfile() {
    return request<{ user: User }>('GET', '/auth/me');
  },

  async updateProfile(data: Partial<User>) {
    return request<{ user: User }>('PUT', '/auth/me', data);
  },

  // ==================== PRODUCTS ====================

  async getProducts(params?: ProductQueryParams) {
    return request<{ products: Product[]; pagination: Pagination }>('GET', '/products', undefined, { params });
  },

  async getProduct(idOrSlug: string) {
    return request<{ product: Product }>('GET', `/products/${idOrSlug}`);
  },

  async getFeaturedProducts(limit = 8) {
    return request<{ products: Product[] }>('GET', '/products', undefined, { params: { featured: true, limit } });
  },

  // ==================== CATEGORIES ====================

  async getCategories() {
    return request<{ categories: Category[] }>('GET', '/categories');
  },

  async getCategoryProducts(slug: string, params?: ProductQueryParams) {
    return request<{ category: Category; products: Product[]; pagination: Pagination }>('GET', `/categories/${slug}/products`, undefined, { params });
  },

  // ==================== CART ====================

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

  // ==================== WISHLIST ====================

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

  // ==================== ORDERS ====================

  async calculateCheckout(data: { shippingRegion?: string; shippingCity?: string; currentCart: any }) {
    return request<{ subtotal: number; shipping: number; total: number; sellers: any[]; shippingInCedis: number; subtotalInCedis: number; totalInCedis: number }>('POST', '/checkout/calculate', data);
  },

  async createOrder(data: CreateOrderInput) {
    return request<{ order: Order; paymentUrl?: string; reference?: string | null }>('POST', '/orders', data);
  },

  async getOrders(params?: { page?: number; limit?: number; status?: string }) {
    return request<{ orders: Order[]; pagination: Pagination }>('GET', '/orders', undefined, { params });
  },

  async getOrder(id: string) {
    return request<{ order: Order }>('GET', `/orders/${id}`);
  },

  async cancelOrder(id: string) {
    return request<{ order: Order }>('POST', `/orders/${id}/cancel`);
  },

  // ==================== PAYMENTS ====================

  async initiateMoMoPayment(orderId: string, phoneNumber: string) {
    return request<{ paymentId: string; reference: string; amount: number; provider: string }>('POST', '/payments/momo/initialize', { orderId, phoneNumber });
  },

  async verifyMoMoPayment(reference: string) {
    return request<{ status: string; orderNumber: string }>('GET', `/payments/momo/verify/${reference}`);
  },

  async initiatePaystackPayment(orderId: string, email: string, callbackUrl?: string) {
    return request<{ paymentId: string; reference: string; authorizationUrl: string; accessCode: string; amount: number; provider: string }>('POST', '/payments/paystack/initialize', { orderId, email, callbackUrl });
  },

  async verifyPaystackPayment(reference: string) {
    return request<{ status: string; orderNumber: string; channel?: string; message?: string }>('GET', `/payments/paystack/verify/${reference}`);
  },

  async getPaymentMethods() {
    return request<{ methods: any[]; defaultMethod: string; currency: string }>('GET', '/payments/methods');
  },

  // ==================== REVIEWS ====================

  async getProductReviews(productId: string, params?: { page?: number; limit?: number }) {
    return request<{ reviews: Review[]; summary: ReviewSummary; pagination: Pagination }>('GET', `/reviews/product/${productId}`, undefined, { params });
  },

  async submitReview(productId: string, data: { rating: number; title?: string; comment?: string }) {
    return request<{ review: Review }>('POST', `/reviews/product/${productId}`, data);
  },

  async getMyReviews() {
    return request<{ reviews: Review[] }>('GET', '/reviews/my-reviews');
  },

  // ==================== SEARCH ====================

  async search(query: string, params?: ProductQueryParams) {
    return request<{ results: SearchResult[]; pagination: Pagination }>('GET', '/search', undefined, { params: { q: query, ...params } });
  },

  async getSearchSuggestions(query: string) {
    return request<{ suggestions: SearchSuggestion[] }>('GET', '/search/suggestions', undefined, { params: { q: query } });
  },

  async getPopularSearches() {
    return request<{ popular: { text: string; slug: string }[] }>('GET', '/search/popular');
  },

  // ==================== UPLOADS ====================

  async uploadImage(file: File, type: 'product' | 'avatar' = 'product') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    // Upload needs special handling for headers
    try {
      const response = await axiosInstance.post<{ success: boolean; data: { url: string; fileId: string; publicId: string }; message?: string }>('/upload/image', formData, {
        headers: {
          'Content-Type': undefined, 
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Upload error:', error);
       if (error.response) {
        return {
          success: false,
          message: error.response.data.message || 'Upload failed',
        };
      }
      return { success: false, message: 'Upload failed' };
    }
  },

  // ==================== ADDRESSES ====================

  async getAddresses() {
    return request<{ addresses: Address[] }>('GET', '/addresses');
  },

  async createAddress(data: CreateAddressInput) {
    return request<{ address: Address }>('POST', '/addresses', data);
  },

  async updateAddress(id: string, data: Partial<CreateAddressInput>) {
    return request<{ address: Address }>('PUT', `/addresses/${id}`, data);
  },

  async deleteAddress(id: string) {
    return request<void>('DELETE', `/addresses/${id}`);
  },

  async setDefaultAddress(id: string) {
    return request<{ address: Address }>('PATCH', `/addresses/${id}/default`);
  },

  // ==================== ADMIN ====================

  async getAdminDashboard() {
    return request<any>('GET', '/admin/dashboard');
  },

  // Alias for backward compat
  async getAdminStats() {
    return request<any>('GET', '/admin/dashboard');
  },

  // Analytics
  async getAdminSalesChart(period = '30d') {
    return request<any>('GET', '/admin/analytics/sales-chart', undefined, { params: { period } });
  },

  async getAdminOrdersByStatus() {
    return request<any>('GET', '/admin/analytics/orders-by-status');
  },

  async getAdminTopCategories(limit = 10) {
    return request<any>('GET', '/admin/analytics/top-categories', undefined, { params: { limit } });
  },

  async getAdminSalesByRegion() {
    return request<any>('GET', '/admin/analytics/by-region');
  },

  // Orders
  async getAdminOrders(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    return request<{ orders: Order[]; pagination: Pagination }>('GET', '/admin/orders', undefined, { params });
  },

  async updateAdminOrderStatus(orderId: string, status: string, notes?: string) {
    return request<any>('PUT', `/admin/orders/${orderId}/status`, { status, notes });
  },

  // Keep old alias
  async updateOrderStatus(orderId: string, status: string) {
    return request<{ order: Order }>('PATCH', `/admin/orders/${orderId}/status`, { status });
  },

  // Seller Applications
  async getAdminSellerApplications(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    return request<any>('GET', '/admin/seller-applications', undefined, { params });
  },

  async getAdminSellerApplication(id: string) {
    return request<any>('GET', `/admin/seller-applications/${id}`);
  },

  async approveSellerApplication(id: string) {
    return request<any>('POST', `/admin/seller-applications/${id}/approve`);
  },

  async rejectSellerApplication(id: string, reason: string) {
    return request<any>('POST', `/admin/seller-applications/${id}/reject`, { reason });
  },

  async requestApplicationInfo(id: string, notes: string) {
    return request<any>('POST', `/admin/seller-applications/${id}/request-info`, { notes });
  },

  async updateApplicationNotes(id: string, notes: string) {
    return request<any>('PUT', `/admin/seller-applications/${id}/notes`, { notes });
  },

  // Sellers Management
  async getAdminSellers(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    return request<any>('GET', '/admin/sellers', undefined, { params });
  },

  async getAdminSeller(id: string) {
    return request<any>('GET', `/admin/sellers/${id}`);
  },

  async suspendSeller(id: string, reason?: string) {
    return request<any>('PUT', `/admin/sellers/${id}/suspend`, { reason });
  },

  async activateSeller(id: string) {
    return request<any>('PUT', `/admin/sellers/${id}/activate`);
  },

  async updateSellerCommission(id: string, commissionRate: number) {
    return request<any>('PUT', `/admin/sellers/${id}/commission-rate`, { commissionRate });
  },

  // Users Management
  async getAdminUsers(params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) {
    return request<any>('GET', '/admin/users', undefined, { params });
  },

  async getAdminUser(id: string) {
    return request<any>('GET', `/admin/users/${id}`);
  },

  async updateAdminUserStatus(id: string, status: string) {
    return request<any>('PUT', `/admin/users/${id}/status`, { status });
  },

  async deleteAdminUser(id: string) {
    return request<any>('DELETE', `/admin/users/${id}`);
  },

  // Activity Logs
  async getAdminActivityLogs(params?: { entity?: string; entityId?: string; page?: number; limit?: number }) {
    return request<any>('GET', '/admin/activity-logs', undefined, { params });
  },

  // Admin Payouts
  async getAdminPayouts(params?: { page?: number; limit?: number; status?: string }) {
    return request<any>('GET', '/payouts/admin/all', undefined, { params });
  },

  async approvePayout(id: string) {
    return request<any>('POST', `/payouts/${id}/approve`);
  },

  async cancelPayout(id: string, reason?: string) {
    return request<any>('POST', `/payouts/${id}/cancel`, { reason });
  },

  async deleteProduct(productId: string) {
    return request<void>('DELETE', `/products/${productId}`);
  },

  // ==================== SELLER APPLICATION ====================

  async createSellerApplication(data: any) {
    return request<{ 
      success: boolean; 
      message: string; 
      data?: { application: any } 
    }>('POST', '/seller/apply', data);
  },

  async getMySellerApplication() {
    return request<{ application: any }>('GET', '/seller/application-status');
  },

  // ==================== SELLER DASHBOARD ====================

  async getSellerProfile() {
    return request<{ profile: any }>('GET', '/seller/me');
  },

  async getSellerStats() {
    return request<{
      stats: {
        totalSales: number;
        salesGrowth: number;
        totalOrders: number;
        ordersGrowth: number;
        activeProducts: number;
        productsGrowth: number;
        rating: number;
        ratingCount: number;
      };
      recentOrders: Order[];
      salesChart: { name: string; sales: number }[];
    }>('GET', '/seller/stats');
  },

  async getSellerProducts(params?: ProductQueryParams) {
    return request<{ products: Product[]; pagination: Pagination }>('GET', '/seller/products', undefined, { params });
  },

  async createProduct(data: any) {
    return request<{ product: Product }>('POST', '/products', data);
  },

  async updateProduct(id: string, data: any) {
    return request<{ product: Product }>('PUT', `/products/${id}`, data);
  },

  // Use deleteProduct for deletion

  async getSellerOrders(params?: { page?: number; limit?: number; status?: string }) {
    return request<{ orders: Order[]; pagination: Pagination }>('GET', '/seller/orders', undefined, { params });
  },

  async updateSellerOrderStatus(orderId: string, status: string) {
    return request<{ order: Order }>('PATCH', `/seller/orders/${orderId}/status`, { status });
  },

  async getSellerWallet() {
    return request<{ wallet: any; history: any[] }>('GET', '/seller/wallet');
  },

  async requestPayout(amountInCedis: number, profile: any) {
    return request<{ payout: any }>('POST', '/payouts/request', { 
      amount: Math.round(amountInCedis * 100),
      mobileMoneyProvider: profile.mobileMoneyProvider || 'MTN',
      mobileMoneyNumber: profile.mobileMoneyNumber || '0000000000',
      mobileMoneyName: profile.businessName || 'Seller'
    });
  },

  async getPayouts(params?: { page?: number; limit?: number; status?: string }) {
    // Assuming createQueryString is defined elsewhere or will be added
    // For now, directly pass params as the 4th argument to request
    return request<any>('GET', `/seller/payouts`, undefined, { params });
  },

  // ==================== PUBLIC SELLER SHOP ====================

  async getSellerBySlug(slug: string) {
    return request<{ profile: any }>('GET', `/seller/${slug}`);
  },

  async getSellerShopProducts(slug: string, params?: { page?: number; limit?: number; sort?: string; search?: string; category?: string }) {
    return request<{ products: Product[]; pagination: Pagination }>('GET', `/seller/${slug}/products`, undefined, { params });
  },

  // ==================== ORDER TRACKING ====================

  async trackOrder(orderNumber: string) {
    return request<{ order: any }>('GET', `/orders/track/${orderNumber}`);
  },

  // ==================== ADMIN COUPONS ====================

  async getAdminCoupons(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    return request<{ coupons: any[]; pagination: Pagination }>('GET', '/admin/coupons', undefined, { params });
  },

  async createCoupon(data: any) {
    return request<{ coupon: any }>('POST', '/admin/coupons', data);
  },

  async updateCoupon(id: string, data: any) {
    return request<{ coupon: any }>('PUT', `/admin/coupons/${id}`, data);
  },

  async deleteCoupon(id: string) {
    return request<void>('DELETE', `/admin/coupons/${id}`);
  },
>>>>>>> 8cce350c8841ec0f588351af62f12ab683f7ff00
};

export default api;
