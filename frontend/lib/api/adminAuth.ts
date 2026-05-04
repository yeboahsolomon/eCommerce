import { request } from './client';

export const adminAuthApi = {
  async login(credentials: { email: string; password: string }) {
    return request<any>('POST', '/admin/auth/login', credentials);
  },

  async logout() {
    return request<any>('POST', '/admin/auth/logout');
  },

  async getMe() {
    return request<any>('GET', '/admin/auth/me');
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return request<any>('POST', '/admin/auth/change-password', data);
  },
};
