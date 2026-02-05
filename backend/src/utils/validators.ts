import { z } from 'zod';

// ==================== AUTH SCHEMAS ====================

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^0(23|24|25|54|55|59|27|57|26|56|20|50)\d{7}$/, 'Invalid Ghana phone number').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ==================== PRODUCT SCHEMAS ====================

export const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  originalPrice: z.number().positive().optional(),
  image: z.string().url('Image must be a valid URL'),
  images: z.array(z.string().url()).optional(),
  categoryId: z.string().cuid('Invalid category ID'),
  inStock: z.boolean().optional().default(true),
  stockQuantity: z.number().int().nonnegative().optional().default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  inStock: z.enum(['true', 'false']).optional(),
  minPrice: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
  sortBy: z.enum(['price', 'rating', 'createdAt', 'name']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

// ==================== CART SCHEMAS ====================

export const addToCartSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1').optional().default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

// ==================== ORDER SCHEMAS ====================

export const createOrderSchema = z.object({
  fullName: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^0(23|24|25|54|55|59|27|57|26|56|20|50)\d{7}$/, 'Invalid Ghana phone number'),
  region: z.string().min(1, 'Please select a region'),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(5, 'Street name/Landmark is required'),
  gpsAddress: z.string().regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/).optional().or(z.literal('')),
  paymentMethod: z.enum(['MOMO', 'CARD', 'CASH']),
});

// ==================== CATEGORY SCHEMAS ====================

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  image: z.string().url().optional(),
});

// ==================== ID PARAM SCHEMA ====================

export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
