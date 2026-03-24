import { request } from './client';
import type { Order, Address, Pagination, CreateOrderInput, CreateAddressInput, TrackingOrder } from '../../types';

export const ordersApi = {
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

  async trackOrder(orderNumber: string) {
    return request<{ order: TrackingOrder }>('GET', `/orders/track/${orderNumber}`);
  },
};

export const paymentsApi = {
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
};

export const addressesApi = {
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
};
