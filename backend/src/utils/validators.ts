import { z } from 'zod';

// ==================== AUTH SCHEMAS ====================

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().regex(/^0(23|24|25|54|55|59|27|57|26|56|20|50)\d{7}$/, 'Invalid Ghana phone number').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ==================== ADDRESS SCHEMAS ====================

export const createAddressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['HOME', 'WORK', 'OTHER']).optional().default('HOME'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().regex(/^0(23|24|25|54|55|59|27|57|26|56|20|50)\d{7}$/, 'Invalid Ghana phone number'),
  region: z.string().min(1, 'Region is required'),
  city: z.string().min(2, 'City is required'),
  area: z.string().optional(),
  streetAddress: z.string().min(5, 'Street address is required'),
  gpsAddress: z.string().regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/).optional().or(z.literal('')),
  isDefault: z.boolean().optional().default(false),
});

// ==================== PRODUCT SCHEMAS ====================

export const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  priceInPesewas: z.number().int().positive('Price must be positive'),
  comparePriceInPesewas: z.number().int().positive().optional(),
  costInPesewas: z.number().int().positive().optional(),
  categoryId: z.string().cuid('Invalid category ID'),
  stockQuantity: z.number().int().nonnegative().optional().default(0),
  lowStockThreshold: z.number().int().nonnegative().optional().default(5),
  trackInventory: z.boolean().optional().default(true),
  allowBackorder: z.boolean().optional().default(false),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  weightInGrams: z.number().int().positive().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  inStock: z.enum(['true', 'false']).optional(),
  minPrice: z.string().regex(/^\d+$/).transform(Number).optional(), // In pesewas
  maxPrice: z.string().regex(/^\d+$/).transform(Number).optional(), // In pesewas
  sortBy: z.enum(['priceInPesewas', 'averageRating', 'createdAt', 'name']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  featured: z.enum(['true', 'false']).optional(),
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
  // Shipping Address
  shippingFullName: z.string().min(2, 'Name is too short'),
  shippingPhone: z.string().regex(/^0(23|24|25|54|55|59|27|57|26|56|20|50)\d{7}$/, 'Invalid Ghana phone number'),
  shippingRegion: z.string().min(1, 'Please select a region'),
  shippingCity: z.string().min(2, 'City is required'),
  shippingArea: z.string().optional(),
  shippingStreetAddress: z.string().min(5, 'Street address is required'),
  shippingGpsAddress: z.string().regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/).optional().or(z.literal('')),
  
  // Contact
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().regex(/^0(23|24|25|54|55|59|27|57|26|56|20|50)\d{7}$/, 'Invalid Ghana phone number'),
  
  // Payment
  paymentMethod: z.enum(['MOMO_MTN', 'MOMO_VODAFONE', 'MOMO_AIRTELTIGO', 'CARD', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
  momoPhoneNumber: z.string().optional(),
  
  // Delivery
  deliveryMethod: z.string().optional().default('standard'),
  deliveryNotes: z.string().optional(),
  
  // Coupon
  couponCode: z.string().optional(),
});

// ==================== CATEGORY SCHEMAS ====================

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  image: z.string().url().optional(),
  parentId: z.string().cuid().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

// ==================== PAYMENT SCHEMAS ====================

export const paymentCallbackSchema = z.object({
  reference: z.string(),
  status: z.enum(['success', 'failed', 'cancelled']),
  gatewayResponse: z.record(z.unknown()).optional(),
});

// ==================== ID PARAM SCHEMA ====================

export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID'),
});

// ==================== TYPE EXPORTS ====================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type PaymentCallbackInput = z.infer<typeof paymentCallbackSchema>;
