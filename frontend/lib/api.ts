import { axiosInstance } from './axios';

// ==================== TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { message: string; path: string[] }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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
  
  async register(data: any) {
    return request<{ user: any; token: string }>('POST', '/auth/register', data);
  },

  async login(email: string, password: string) {
    return request<{ user: any; token: string }>('POST', '/auth/login', { email, password });
  },

  async logout() {
    return request<null>('POST', '/auth/logout');
  },

  async getProfile() {
    return request<{ user: any }>('GET', '/auth/me');
  },

  async updateProfile(data: any) {
    return request<{ user: any }>('PUT', '/auth/me', data);
  },

  // ==================== PRODUCTS ====================

  async getProducts(params?: any) {
    return request<{ products: any[]; pagination: any }>('GET', '/products', undefined, { params });
  },

  async getProduct(idOrSlug: string) {
    return request<{ product: any }>('GET', `/products/${idOrSlug}`);
  },

  async getFeaturedProducts(limit = 8) {
    return request<{ products: any[] }>('GET', '/products', undefined, { params: { featured: true, limit } });
  },

  // ==================== CATEGORIES ====================

  async getCategories() {
    return request<{ categories: any[] }>('GET', '/categories');
  },

  async getCategoryProducts(slug: string, params?: any) {
    return request<{ category: any; products: any[] }>('GET', `/categories/${slug}/products`, undefined, { params });
  },

  // ==================== CART ====================

  async getCart() {
    return request<{ cart: any }>('GET', '/cart');
  },

  async addToCart(productId: string, quantity = 1) {
    return request<{ cart: any }>('POST', '/cart/items', { productId, quantity });
  },

  async updateCartItem(productId: string, quantity: number) {
    return request<{ cart: any }>('PUT', `/cart/items/${productId}`, { quantity });
  },

  async removeFromCart(productId: string) {
    return request<{ cart: any }>('DELETE', `/cart/items/${productId}`);
  },

  async clearCart() {
    return request<{ cart: any }>('DELETE', '/cart');
  },

  // ==================== WISHLIST ====================

  async getWishlist() {
    return request<{ items: any[] }>('GET', '/wishlist');
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

  async createOrder(data: any) {
    return request<{ order: any }>('POST', '/orders', data);
  },

  async getOrders(params?: any) {
    return request<{ orders: any[]; pagination: any }>('GET', '/orders', undefined, { params });
  },

  async getOrder(id: string) {
    return request<{ order: any }>('GET', `/orders/${id}`);
  },

  // ==================== PAYMENTS ====================

  async initiateMoMoPayment(orderId: string, phoneNumber: string) {
    return request<any>('POST', '/payments/momo/initialize', { orderId, phoneNumber });
  },

  async verifyMoMoPayment(reference: string) {
    return request<any>('GET', `/payments/momo/verify/${reference}`);
  },

  async initiatePaystackPayment(orderId: string, email: string, callbackUrl?: string) {
    return request<any>('POST', '/payments/paystack/initialize', { orderId, email, callbackUrl });
  },

  async verifyPaystackPayment(reference: string) {
    return request<any>('GET', `/payments/paystack/verify/${reference}`);
  },

  async getPaymentMethods() {
    return request<any>('GET', '/payments/methods');
  },

  // ==================== REVIEWS ====================

  async getProductReviews(productId: string, params?: any) {
    return request<{ reviews: any[]; summary: any }>('GET', `/reviews/product/${productId}`, undefined, { params });
  },

  async submitReview(productId: string, data: any) {
    return request<{ review: any }>('POST', `/reviews/product/${productId}`, data);
  },

  async getMyReviews() {
    return request<{ reviews: any[] }>('GET', '/reviews/my-reviews');
  },

  // ==================== SEARCH ====================

  async search(query: string, params?: any) {
    return request<{ results: any[]; pagination: any }>('GET', '/search', undefined, { params: { q: query, ...params } });
  },

  async getSearchSuggestions(query: string) {
    return request<{ suggestions: any[] }>('GET', '/search/suggestions', undefined, { params: { q: query } });
  },

  async getPopularSearches() {
    return request<{ popular: any[] }>('GET', '/search/popular');
  },

  // ==================== UPLOADS ====================

  async uploadImage(file: File, type: 'product' | 'avatar' = 'product') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    // Upload needs special handling for headers
    try {
      const response = await axiosInstance.post('/upload/image', formData, {
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
    return request<{ addresses: any[] }>('GET', '/addresses');
  },

  async createAddress(data: any) {
    return request<{ address: any }>('POST', '/addresses', data);
  },

  async updateAddress(id: string, data: any) {
    return request<{ address: any }>('PUT', `/addresses/${id}`, data);
  },

  async deleteAddress(id: string) {
    return request<void>('DELETE', `/addresses/${id}`);
  },

  async setDefaultAddress(id: string) {
    return request<{ address: any }>('PATCH', `/addresses/${id}/default`);
  },

  // ==================== ADMIN ====================

  async getAdminStats() {
    return request<any>('GET', '/admin/stats');
  },

  async getAdminOrders(params?: any) {
    return request<{ orders: any[] }>('GET', '/admin/orders', undefined, { params });
  },

  async updateOrderStatus(orderId: string, status: string) {
    return request<{ order: any }>('PATCH', `/admin/orders/${orderId}/status`, { status });
  },

  async deleteProduct(productId: string) {
    return request<void>('DELETE', `/products/${productId}`);
  },
};

export default api;

