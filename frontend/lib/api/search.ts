import { request } from './client';
import type { Review, SearchResult, SearchSuggestion, Pagination, ProductQueryParams } from '../../types';
import { axiosInstance } from '../axios';

export const reviewsApi = {
  async getProductReviews(productId: string, params?: { page?: number; limit?: number }) {
    return request<{ reviews: Review[]; summary: import('../../types').ReviewSummary; pagination: Pagination }>('GET', `/reviews/product/${productId}`, undefined, { params });
  },

  async submitReview(productId: string, data: { rating: number; title?: string; comment?: string }) {
    return request<{ review: Review }>('POST', `/reviews/product/${productId}`, data);
  },

  async getMyReviews() {
    return request<{ reviews: Review[] }>('GET', '/reviews/my-reviews');
  },
};

export const searchApi = {
  async search(query: string, params?: ProductQueryParams) {
    return request<{ results: SearchResult[]; pagination: Pagination }>('GET', '/search', undefined, { params: { q: query, ...params } });
  },

  async getSearchSuggestions(query: string) {
    return request<{ suggestions: SearchSuggestion[] }>('GET', '/search/suggestions', undefined, { params: { q: query } });
  },

  async getPopularSearches() {
    return request<{ popular: { text: string; slug: string }[] }>('GET', '/search/popular');
  },
};

export const uploadsApi = {
  async uploadImage(file: File, type: 'product' | 'avatar' = 'product') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    try {
      const response = await axiosInstance.post<{ success: boolean; data: { url: string; fileId: string; publicId: string }; message?: string }>('/upload/image', formData, {
        headers: {
          'Content-Type': undefined,
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.response) {
        return {
          success: false,
          message: error.response.data.message || 'Upload failed',
        };
      }
      return { success: false, message: 'Upload failed' };
    }
  },
};
