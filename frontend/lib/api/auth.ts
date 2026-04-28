import { request } from './client';
import type { User, RegisterData } from '../../types';

export const authApi = {
  async register(data: RegisterData) {
    return request<{ user: User }>('POST', '/auth/register', data);
  },

  async login(email: string, password: string, rememberMe?: boolean) {
    return request<{ user: User, otpRequired?: boolean, preAuthToken?: string }>('POST', '/auth/login', { email, password, rememberMe });
  },

  async googleLogin(credential: string) {
    return request<{ user: User }>('POST', '/auth/google', { credential });
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

  async forgotPassword(email: string) {
    return request<null>('POST', '/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string) {
    return request<null>('POST', '/auth/reset-password', { token, newPassword });
  },

  async verifyPhone(idToken: string, phone: string) {
    return request<{ phoneVerified: boolean }>('POST', '/user/verify-phone', { idToken, phone });
  },

  async verifyAdminOtp(preAuthToken: string, firebaseIdToken: string) {
    return request<{ user: User }>('POST', '/auth/verify-admin-otp', { preAuthToken, firebaseIdToken });
  },
};
