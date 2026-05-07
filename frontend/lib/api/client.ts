import { axiosInstance } from '../axios';

// ==================== SHARED TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { message: string; path: string[] }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: import('../../types').Pagination;
}

// ==================== REQUEST HELPER ====================

export async function request<T>(
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
    // Suppress expected auth checks (401), not-found (404), and network errors from the overlay
    const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
    const isAuthCheck = error.response?.status === 401;
    const isNotFound = error.response?.status === 404;

    if (!isNetworkError && !isAuthCheck && !isNotFound) {
      console.error('API Error:', error);
    }
    
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
