import { axiosInstance } from './axios';
import { ApiResponse, PaginatedResponse } from './api';
import { Product, CreateProductInput, UpdateProductInput } from '../types';

export const sellerApi = {
  // Get seller's own products
  async getMyProducts(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string 
  }) {
    // We might need a specific endpoint for "my products" or filter the main one
    // But typically sellers want to see even inactive ones.
    // The backend `GET /api/products` filters by `isActive: true` by default.
    // We might need a seller-specific endpoint or update the main one to allow fetching inactive if seller.
    // Actually, `GET /api/seller/products` would be ideal if it existed, but `GET /api/products` with filter might work if backend allows.
    // Let's use the main one for now but we might need to adjust backend to allow sellers to see their inactive products.
    // Wait, the plan said "Get Products (GET)". 
    // If I look at `products.routes.ts`, it filters `isActive: true`.
    // Sellers need to see inactive products too.
    // I should probably add `GET /api/seller/products` or `GET /api/products/my-products`?
    // Let's check `seller.routes.ts` again. It has `GET /orders`. It does NOT have `GET /products`.
    // I should probably add `GET /products` to `seller.routes.ts` or modify `products.routes.ts` to allow sellers to see their own inactive products.
    // For now, let's assume I need to add it to generic logic or use what I have.
    // I'll stick to what I have but note the limitation or fix it if I can.
    // Actually, I can use `GET /api/products?sellerId=ME` if I implement that, but security.
    
    // BETTER APPROACH: Add `GET /api/seller/products` in backend to list OWN products (active/inactive).
    // I will add this to backend in a bit. For now, let's define the frontend call.
    return axiosInstance.get<ApiResponse<{ products: Product[]; pagination: any }>>('/seller/products', { params })
      .then(res => res.data);
  },

  async createProduct(data: CreateProductInput) {
    return axiosInstance.post<ApiResponse<{ product: Product }>>('/products', data)
      .then(res => res.data);
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    return axiosInstance.put<ApiResponse<{ product: Product }>>(`/products/${id}`, data)
      .then(res => res.data);
  },

  async deleteProduct(id: string) {
    return axiosInstance.delete<ApiResponse<void>>(`/products/${id}`)
      .then(res => res.data);
  },

  // Image Management (R2)
  getUploadUrl: async (productId: string, fileName: string, fileType: string) => {
    const res = await axiosInstance.post('/upload/url', { productId, fileName, fileType });
    return res.data.data; // { uploadUrl, storageKey, publicUrl }
  },

  saveImageMetadata: async (productId: string, data: { storageKey: string, fileSize: number, mimeType: string, isPrimary: boolean }) => {
    const res = await axiosInstance.post('/upload/persist', { productId, ...data });
    return res.data.data.image;
  },

  uploadFileToR2: async (productId: string, file: File, isPrimary: boolean) => {
      // 1. Get Presigned URL
      const { uploadUrl, storageKey } = await sellerApi.getUploadUrl(productId, file.name, file.type);
      
      // 2. Upload to R2
      await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
              'Content-Type': file.type,
          },
      });

      // 3. Save Metadata
      return await sellerApi.saveImageMetadata(productId, {
          storageKey,
          fileSize: file.size,
          mimeType: file.type,
          isPrimary
      });
  },

  deleteProductImage: async (imageId: string) => {
    return axiosInstance.delete<ApiResponse<void>>(`/upload/${imageId}`)
      .then(res => res.data);
  },
  

};
