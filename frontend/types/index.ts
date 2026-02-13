// ==================== FRONTEND TYPES ====================
// Types matching the backend API responses

// ==================== AUTH ====================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

// ==================== PRODUCTS ====================

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceInPesewas: number;
  comparePriceInPesewas?: number;
  image: string | null;
  images?: ProductImage[];
  category: Category;
  averageRating: number;
  reviewCount: number;
  inStock: boolean;
  stockQuantity?: number;
  isFeatured: boolean;
  isActive?: boolean;
  seller?: {
    id: string;
    businessName: string;
  };
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
}

// ==================== CATEGORIES ====================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  children?: Category[];
  productCount?: number;
}

// ==================== CART ====================

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  priceAtAddInCedis: number;
  product: {
    id: string;
    name: string;
    slug: string;
    priceInPesewas: number;
    image: string | null;
    inStock: boolean;
    stockQuantity: number;
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotalInCedis: number;
}

// ==================== WISHLIST ====================

export interface WishlistItem {
  id: string;
  productId: string;
  note?: string;
  addedAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    priceInPesewas: number;
    comparePriceInPesewas?: number;
    image: string | null;
    category: Category;
    inStock: boolean;
    averageRating: number;
  };
}

export interface Wishlist {
  id: string;
  itemCount: number;
  items: WishlistItem[];
}

// ==================== ORDERS ====================

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'FAILED';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  quantity: number;
  unitPriceInCedis: number;
  totalPriceInCedis: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotalInCedis: number;
  shippingInCedis: number;
  discountInCedis: number;
  totalInCedis: number;
  items: OrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    region: string;
    city: string;
    streetAddress: string;
  };
  payment?: {
    status: string;
    method: string;
    reference?: string;
  };
  createdAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
}

// ==================== REVIEWS ====================

export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

// ==================== SEARCH ====================

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceInPesewas: number;
  comparePriceInPesewas?: number;
  image: string | null;
  category: Category;
  averageRating: number;
  reviewCount: number;
  inStock: boolean;
  isFeatured: boolean;
}

export interface SearchSuggestion {
  type: 'product' | 'category';
  id: string;
  text: string;
  slug: string;
  description: string;
}

// ==================== PAGINATION ====================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ==================== ADDRESSES ====================

export interface Address {
  id: string;
  label?: string;
  fullName: string;
  phone: string;
  region: string;
  city: string;
  area?: string;
  streetAddress: string;
  gpsAddress?: string;
  isDefault: boolean;
}

// ==================== CONTEXT TYPES ====================

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean }>;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  addItem: (productId: string, quantity?: number, product?: Product) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
}

export interface WishlistContextType {
  wishlist: Wishlist | null;
  isLoading: boolean;
  addItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  moveToCart: () => Promise<void>;
  itemCount: number;
}

// ==================== REQUEST PAYLOADS ====================

export interface CreateAddressInput {
  label: string;
  type?: 'HOME' | 'WORK' | 'OTHER';
  fullName: string;
  phone: string;
  region: string;
  city: string;
  area?: string;
  streetAddress: string;
  gpsAddress?: string;
  isDefault?: boolean;
}

export interface CreateOrderInput {
  // Shipping Address
  shippingFullName: string;
  shippingPhone: string;
  shippingRegion: string;
  shippingCity: string;
  shippingArea?: string;
  shippingStreetAddress: string;
  shippingGpsAddress?: string;

  // Contact
  customerEmail: string;
  customerPhone: string;

  // Payment
  paymentMethod: 'MOMO_MTN' | 'MOMO_VODAFONE' | 'MOMO_AIRTELTIGO' | 'CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
  momoPhoneNumber?: string;

  // Delivery
  deliveryMethod?: string;
  deliveryNotes?: string;

  // Coupon
  couponCode?: string;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'priceInPesewas' | 'averageRating' | 'createdAt' | 'name';
  order?: 'asc' | 'desc';
  featured?: boolean;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  priceInPesewas: number;
  comparePriceInPesewas?: number;
  costInPesewas?: number;
  categoryId: string;
  sellerId?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  sku?: string;
  barcode?: string;
  metaTitle?: string;
  metaDescription?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  weightInGrams?: number;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}
