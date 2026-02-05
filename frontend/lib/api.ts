// ==================== API CLIENT SERVICE ====================
// Centralized API client for the eCommerce frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

// ==================== API CLIENT CLASS ====================

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401) {
          this.setToken(null);
          // Optionally redirect to login
        }
        return {
          success: false,
          message: data.message || 'An error occurred',
          errors: data.errors,
        };
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
      };
    }
  }

  // ==================== AUTH ====================

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    return this.request<{ user: object; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    const response = await this.request<{ user: object; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout() {
    this.setToken(null);
    return { success: true };
  }

  async getProfile() {
    return this.request<{ user: object }>('/auth/me');
  }

  async updateProfile(data: { firstName?: string; lastName?: string; phone?: string }) {
    return this.request<{ user: object }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ==================== PRODUCTS ====================

  async getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    featured?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    return this.request<{ products: object[]; pagination: object }>(
      `/products?${searchParams.toString()}`
    );
  }

  async getProduct(idOrSlug: string) {
    return this.request<{ product: object }>(`/products/${idOrSlug}`);
  }

  async getFeaturedProducts(limit = 8) {
    return this.request<{ products: object[] }>(`/products?featured=true&limit=${limit}`);
  }

  // ==================== CATEGORIES ====================

  async getCategories() {
    return this.request<{ categories: object[] }>('/categories');
  }

  async getCategoryProducts(slug: string, params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    return this.request<{ category: object; products: object[] }>(
      `/categories/${slug}/products?${searchParams.toString()}`
    );
  }

  // ==================== CART ====================

  async getCart() {
    return this.request<{ cart: object }>('/cart');
  }

  async addToCart(productId: string, quantity = 1) {
    return this.request<{ cart: object }>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async updateCartItem(productId: string, quantity: number) {
    return this.request<{ cart: object }>(`/cart/items/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(productId: string) {
    return this.request<{ cart: object }>(`/cart/items/${productId}`, {
      method: 'DELETE',
    });
  }

  async clearCart() {
    return this.request<{ cart: object }>('/cart', {
      method: 'DELETE',
    });
  }

  // ==================== WISHLIST ====================

  async getWishlist() {
    return this.request<{ items: object[] }>('/wishlist');
  }

  async addToWishlist(productId: string, note?: string) {
    return this.request<{ id: string }>('/wishlist/items', {
      method: 'POST',
      body: JSON.stringify({ productId, note }),
    });
  }

  async removeFromWishlist(productId: string) {
    return this.request<void>(`/wishlist/items/${productId}`, {
      method: 'DELETE',
    });
  }

  async checkWishlist(productId: string) {
    return this.request<{ inWishlist: boolean }>(`/wishlist/check/${productId}`);
  }

  async moveWishlistToCart() {
    return this.request<{ movedCount: number }>('/wishlist/move-to-cart', {
      method: 'POST',
    });
  }

  // ==================== ORDERS ====================

  async createOrder(data: {
    shippingAddressId?: string;
    shippingAddress?: object;
    paymentMethod: string;
    notes?: string;
  }) {
    return this.request<{ order: object }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrders(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    return this.request<{ orders: object[]; pagination: object }>(
      `/orders?${searchParams.toString()}`
    );
  }

  async getOrder(id: string) {
    return this.request<{ order: object }>(`/orders/${id}`);
  }

  // ==================== PAYMENTS ====================

  async initiateMoMoPayment(orderId: string, phoneNumber: string) {
    return this.request<{ 
      paymentId: string;
      reference: string; 
      status: string;
      amount: number;
      currency: string;
      provider: string;
    }>('/payments/momo/initialize', {
      method: 'POST',
      body: JSON.stringify({ orderId, phoneNumber }),
    });
  }

  async verifyMoMoPayment(reference: string) {
    return this.request<{ 
      status: string;
      message?: string;
      orderNumber?: string;
    }>(`/payments/momo/verify/${reference}`);
  }

  async initiatePaystackPayment(orderId: string, email: string, callbackUrl?: string) {
    return this.request<{
      paymentId: string;
      reference: string;
      authorizationUrl: string;
      accessCode: string;
      amount: number;
      currency: string;
      provider: string;
    }>('/payments/paystack/initialize', {
      method: 'POST',
      body: JSON.stringify({ orderId, email, callbackUrl }),
    });
  }

  async verifyPaystackPayment(reference: string) {
    return this.request<{
      status: string;
      message?: string;
      orderNumber?: string;
      channel?: string;
    }>(`/payments/paystack/verify/${reference}`);
  }

  async getPaymentMethods() {
    return this.request<{
      methods: Array<{
        id: string;
        name: string;
        description: string;
        icon: string;
        channels?: string[];
        networks?: string[];
      }>;
      defaultMethod: string;
      currency: string;
    }>('/payments/methods');
  }

  // ==================== REVIEWS ====================

  async getProductReviews(productId: string, params?: { page?: number; sort?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    return this.request<{ reviews: object[]; summary: object }>(
      `/reviews/product/${productId}?${searchParams.toString()}`
    );
  }

  async submitReview(productId: string, data: { rating: number; title?: string; comment?: string }) {
    return this.request<{ review: object }>(`/reviews/product/${productId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyReviews() {
    return this.request<{ reviews: object[] }>('/reviews/my-reviews');
  }

  // ==================== SEARCH ====================

  async search(query: string, params?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    inStock?: boolean;
    sort?: string;
    page?: number;
  }) {
    const searchParams = new URLSearchParams({ q: query });
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    return this.request<{ results: object[]; pagination: object }>(
      `/search?${searchParams.toString()}`
    );
  }

  async getSearchSuggestions(query: string) {
    return this.request<{ suggestions: object[] }>(`/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  async getPopularSearches() {
    return this.request<{ popular: object[] }>('/search/popular');
  }

  // ==================== UPLOADS ====================

  async uploadImage(file: File, type: 'product' | 'avatar' = 'product') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    const url = `${this.baseUrl}/upload/image`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        body: formData,
      });

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, message: 'Upload failed' };
    }
  }
}

// Export singleton instance
export const api = new ApiClient();
export default api;
