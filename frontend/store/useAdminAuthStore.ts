import { create } from 'zustand';
import { adminAuthApi } from '@/lib/api/adminAuth';

interface AdminUser {
  name: string;
  email: string;
  role: string;
}

interface AdminAuthState {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  admin: null,
  isLoading: true,
  isAuthenticated: false,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = (await adminAuthApi.getMe()) as any;
      if (response.success && response.admin) {
        set({ admin: response.admin, isAuthenticated: true });
      } else if (response.success && response.data?.admin) {
        set({ admin: response.data.admin, isAuthenticated: true });
      } else {
        set({ admin: null, isAuthenticated: false });
      }
    } catch (error) {
      set({ admin: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const response = (await adminAuthApi.login({ email, password })) as any;
      if (response.success && response.admin) {
        set({ admin: response.admin, isAuthenticated: true });
        return { success: true };
      }
      if (response.success && response.data?.admin) {
        set({ admin: response.data.admin, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, message: response.message || 'Login failed' };
    } catch (error: any) {
      return { success: false, message: error.message || 'An error occurred' };
    }
  },

  logout: async () => {
    try {
      await adminAuthApi.logout();
    } catch (error) {
      console.error('Admin logout error:', error);
    } finally {
      set({ admin: null, isAuthenticated: false });
    }
  },
}));
