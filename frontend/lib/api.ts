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

export const api = {
  // ==================== AUTH ====================
  
  async register(data: RegisterData) {
    return request<{ user: User; token: string }>('POST', '/auth/register', data);
  },

  async login(email: string, password: string) {
    return request<{ user: User; token: string }>('POST', '/auth/login', { email, password });
  },

  async logout() {
    return request<null>('POST', '/auth/logout');
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

  async addToCart(productId: string, quantity = 1) {
    return request<{ cart: Cart }>('POST', '/cart/items', { productId, quantity });
  },

  async updateCartItem(productId: string, quantity: number) {
    return request<{ cart: Cart }>('PUT', `/cart/items/${productId}`, { quantity });
  },

  async removeFromCart(productId: string) {
    return request<{ cart: Cart }>('DELETE', `/cart/items/${productId}`);
  },

  async clearCart() {
    return request<{ cart: Cart }>('DELETE', '/cart');
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

  async createOrder(data: CreateOrderInput) {
    return request<{ order: Order }>('POST', '/orders', data);
  },

  async getOrders(params?: { page?: number; limit?: number }) {
    return request<{ orders: Order[]; pagination: Pagination }>('GET', '/orders', undefined, { params });
  },

  async getOrder(id: string) {
    return request<{ order: Order }>('GET', `/orders/${id}`);
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
    return request<{ popular: string[] }>('GET', '/search/popular');
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
          'Content-Type': 'multipart/form-data',
        },
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

  async getAdminStats() {
    return request<{ 
      totalSales: number; 
      salesGrowth: number; 
      totalOrders: number; 
      ordersGrowth: number; 
      totalUsers: number; 
      usersGrowth: number; 
      activeProducts: number; 
    }>('GET', '/admin/stats');
  },

  async getAdminOrders(params?: { page?: number; limit?: number; status?: string }) {
    return request<{ orders: Order[]; pagination: Pagination }>('GET', '/admin/orders', undefined, { params });
  },

  async updateOrderStatus(orderId: string, status: string) {
    return request<{ order: Order }>('PATCH', `/admin/orders/${orderId}/status`, { status });
  },

  async deleteProduct(productId: string) {
    return request<void>('DELETE', `/products/${productId}`);
  },
};

export default api;
