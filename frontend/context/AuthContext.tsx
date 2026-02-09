'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '@/lib/api';
import { User, AuthContextType, RegisterData } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.getProfile();
        if (response.success && response.data) {
          setUser(response.data.user as User);
        }
      } catch (error) {
        // Not authenticated
        console.log('Not authenticated');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      if (response.success && response.data) {
        setUser(response.data.user as User);
        return { success: true };
      }
      return { success: false, message: response.message || 'Login failed' };
    } catch {
      return { success: false, message: 'An error occurred' };
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const response = await api.register(data);
      if (response.success && response.data) {
        // Auto-login after registration
        // Auto-login after registration (cookie set by backend)
        setUser(response.data.user as User);
        return { success: true };
      }
      return { success: false, message: response.message || 'Registration failed' };
    } catch {
      return { success: false, message: 'An error occurred' };
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const response = await api.updateProfile(data);
      if (response.success && response.data) {
        setUser(response.data.user as User);
        return { success: true };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
