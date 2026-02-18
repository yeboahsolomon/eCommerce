import { create } from 'zustand';
import { api } from '@/lib/api';
import { User, RegisterData } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean }>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getProfile();
      if (response.success && response.data) {
        set({ user: response.data.user, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password, rememberMe) => {
    try {
      const response = await api.login(email, password, rememberMe);
      if (response.success && response.data) {
        set({ user: response.data.user, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, message: response.message || 'Login failed' };
    } catch (error: any) {
      return { success: false, message: error.message || 'An error occurred' };
    }
  },

  register: async (data) => {
    try {
      const response = await api.register(data);
      if (response.success && response.data) {
        set({ user: response.data.user, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, message: response.message || 'Registration failed' };
    } catch (error: any) {
      return { success: false, message: error.message || 'An error occurred' };
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await api.updateProfile(data);
      if (response.success && response.data) {
        set({ user: response.data.user });
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  },
}));
