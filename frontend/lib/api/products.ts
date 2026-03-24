import { request } from './client';
import type { Product, Category, Pagination, ProductQueryParams, CreateProductInput, UpdateProductInput } from '../../types';

export const productsApi = {
  async getProducts(params?: ProductQueryParams) {
    return request<{ products: Product[]; pagination: Pagination }>('GET', '/products', undefined, { params });
  },

  async getProduct(idOrSlug: string) {
    return request<{ product: Product }>('GET', `/products/${idOrSlug}`);
  },

  async getFeaturedProducts(limit = 8) {
    return request<{ products: Product[] }>('GET', '/products', undefined, { params: { featured: true, limit } });
  },

  async createProduct(data: CreateProductInput) {
    return request<{ product: Product }>('POST', '/products', data);
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    return request<{ product: Product }>('PUT', `/products/${id}`, data);
  },

  async deleteProduct(productId: string) {
    return request<void>('DELETE', `/products/${productId}`);
  },
};

export const categoriesApi = {
  async getCategories() {
    return request<{ categories: Category[] }>('GET', '/categories');
  },

  async getCategoryProducts(slug: string, params?: ProductQueryParams) {
    return request<{ category: Category; products: Product[]; pagination: Pagination }>('GET', `/categories/${slug}/products`, undefined, { params });
  },
};
