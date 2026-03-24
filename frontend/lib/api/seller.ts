import { request } from './client';
import type { Order, Product, Pagination, ProductQueryParams } from '../../types';

export const sellerApi = {
  // Application
  async createSellerApplication(data: any) {
    return request<{ success: boolean; message: string; data?: { application: any } }>('POST', '/seller/apply', data);
  },

  async getMySellerApplication() {
    return request<{ application: any }>('GET', '/seller/application-status');
  },

  // Dashboard
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

  async getSellerOrders(params?: { page?: number; limit?: number; status?: string }) {
    return request<{ orders: Order[]; pagination: Pagination }>('GET', '/seller/orders', undefined, { params });
  },

  async updateSellerOrderStatus(orderId: string, status: string) {
    return request<{ order: Order }>('PATCH', `/seller/orders/${orderId}/status`, { status });
  },

  // Wallet & Payouts
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
    return request<any>('GET', `/seller/payouts`, undefined, { params });
  },

  // Public Shop
  async getSellerBySlug(slug: string) {
    return request<{ profile: any }>('GET', `/seller/${slug}`);
  },

  async getSellerShopProducts(slug: string, params?: { page?: number; limit?: number; sort?: string; search?: string; category?: string }) {
    return request<{ products: Product[]; pagination: Pagination }>('GET', `/seller/${slug}/products`, undefined, { params });
  },
};
