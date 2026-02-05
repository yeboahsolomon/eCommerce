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
  priceInCedis: number;
  comparePriceInCedis?: number;
  image: string | null;
  images?: ProductImage[];
  category: Category;
  averageRating: number;
  reviewCount: number;
  inStock: boolean;
  stockQuantity?: number;
  isFeatured: boolean;
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
    priceInCedis: number;
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
    priceInCedis: number;
    comparePriceInCedis?: number;
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
  priceInCedis: number;
  comparePriceInCedis?: number;
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
  addItem: (productId: string, quantity?: number) => Promise<void>;
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