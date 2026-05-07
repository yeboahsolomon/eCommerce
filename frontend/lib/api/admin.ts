import { request } from './client';
import type { Order, Product, Pagination } from '../../types';

export const adminApi = {
  // Dashboard
  async getAdminDashboardStats() {
    return request<any>('GET', '/admin/dashboard/stats');
  },
  async getAdminDashboardRecentOrders() {
    return request<any>('GET', '/admin/dashboard/recent-orders');
  },

  // Alerts (Smart Notification Center)
  async getAdminAlerts() {
    return request<any>('GET', '/admin/alerts');
  },

  async getAdminAlertCount() {
    return request<{ count: number }>('GET', '/admin/alerts/count');
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

  // Payouts
  async getAdminPayouts(params?: { page?: number; limit?: number; status?: string }) {
    return request<any>('GET', '/payouts/admin/all', undefined, { params });
  },

  async approvePayout(id: string) {
    return request<any>('POST', `/payouts/${id}/approve`);
  },

  async cancelPayout(id: string, reason?: string) {
    return request<any>('POST', `/payouts/${id}/cancel`, { reason });
  },

  // Coupons
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
    return request<any>('DELETE', `/admin/coupons/${id}`);
  },

  async getAdminTransactions(params?: { status?: string; method?: string; search?: string }) {
    return request<any>('GET', '/admin/transactions', undefined, { params });
  },

  async getAdminTransactionsSummary() {
    return request<any>('GET', '/admin/transactions/summary');
  },

  // Settings
  async getAdminProfile() {
    return request<any>('GET', '/admin/settings/profile');
  },

  async updateAdminProfile(data: any) {
    return request<any>('PUT', '/admin/settings/profile', data);
  },

  async getAdminConfig() {
    return request<any>('GET', '/admin/settings/config');
  },

  async updateAdminConfig(data: any) {
    return request<any>('PUT', '/admin/settings/config', data);
  },

  async getAdminSessions() {
    return request<any>('GET', '/admin/settings/sessions');
  },

  // Disputes & Flags
  async getAdminDisputes() {
    return request<any>('GET', '/admin/disputes');
  },

  async updateAdminDisputeStatus(id: string, status: string) {
    return request<any>('PUT', `/admin/disputes/${id}/status`, { status });
  },

  async getAdminFlaggedProducts() {
    return request<any>('GET', '/admin/disputes/flagged-products');
  },

  async updateAdminFlaggedProductStatus(id: string, status: string) {
    return request<any>('PUT', `/admin/disputes/flagged-products/${id}/status`, { status });
  },

  // Announcements
  async getAdminAnnouncements() {
    return request<any>('GET', '/admin/announcements');
  },

  async createAdminAnnouncement(data: any) {
    return request<any>('POST', '/admin/announcements', data);
  },

  async updateAdminAnnouncement(id: string, data: any) {
    return request<any>('PUT', `/admin/announcements/${id}`, data);
  },

  async deleteAdminAnnouncement(id: string) {
    return request<any>('DELETE', `/admin/announcements/${id}`);
  },
};
