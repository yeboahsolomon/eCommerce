import { prisma } from '../lib/prisma.js';
import { CreateSellerProfileInput, UpdateSellerProfileInput } from '../utils/validators.js';
import { ApiError } from '../middleware/error.middleware.js';

export class SellerService {
  
  /**
   * Create a new seller profile for a user
   */
  async createProfile(userId: string, data: CreateSellerProfileInput) {
    // Check if user already has a profile
    const existing = await prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ApiError(400, 'User already has a seller profile');
    }

    // Check if slug is taken
    const slugTaken = await prisma.sellerProfile.findUnique({
      where: { slug: data.slug },
    });

    if (slugTaken) {
      throw new ApiError(400, 'Shop URL (slug) is already taken. Please choose another.');
    }

    // Create profile
    // Also create a SellerWallet for them
    return await prisma.$transaction(async (tx) => {
      const profile = await tx.sellerProfile.create({
        data: {
          userId,
          ...data,
          wallet: {
            create: {
              currentBalance: 0,
              pendingBalance: 0,
            }
          }
        },
        include: {
          wallet: true,
        }
      });

      // Update user role to SELLER if not already
      await tx.user.update({
        where: { id: userId },
        data: { role: 'SELLER' },
      });

      return profile;
    });
  }

  /**
   * Approve a seller profile
   */
  async approveProfile(sellerId: string) {
    return prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }

  /**
   * Get seller profile by User ID
   */
  async getProfileByUserId(userId: string) {
    return await prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        wallet: true,
      }
    });
  }

  /**
   * Get seller profile by Slug (Public View)
   */
  async getProfileBySlug(slug: string) {
    return await prisma.sellerProfile.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: true, reviews: true }
        }
      }
    });
  }

  /**
   * Update seller profile
   */
  async updateProfile(userId: string, data: UpdateSellerProfileInput) {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) throw new ApiError(404, 'Seller profile not found');

    if (data.slug && data.slug !== profile.slug) {
      const slugTaken = await prisma.sellerProfile.findUnique({
        where: { slug: data.slug },
      });
      if (slugTaken) throw new ApiError(400, 'Slug taken');
    }

    return await prisma.sellerProfile.update({
      where: { userId },
      data,
    });
  }

  /**
   * Get Seller Dashboard Stats
   */
  async getDashboardStats(userId: string) {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) throw new ApiError(404, 'Seller profile not found');

    const sellerId = profile.id;
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const [
      totalOrders,
      ordersToday,
      totalRevenue,
      pendingOrders,
      lowStockProducts
    ] = await Promise.all([
      prisma.sellerOrder.count({ where: { sellerId } }),
      prisma.sellerOrder.count({ 
        where: { sellerId, createdAt: { gte: startOfToday } } 
      }),
      prisma.sellerOrder.aggregate({
        where: { sellerId, status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } },
        _sum: { subtotalInPesewas: true }
      }),
      prisma.sellerOrder.count({ where: { sellerId, status: { in: ['PENDING', 'PAYMENT_PENDING'] } } }),
      prisma.product.count({
        where: {
          sellerId,
          trackInventory: true,
          stockQuantity: { lte: 5 } // Hardcoded low stock for now
        }
      })
    ]);

    return {
      orders: {
        total: totalOrders,
        today: ordersToday,
        pending: pendingOrders,
      },
      revenue: {
        total: (totalRevenue._sum.subtotalInPesewas || 0) / 100,
      },
      inventory: {
        lowStock: lowStockProducts,
      }
    };
  }

  /**
   * Get Seller Orders
   */
  async getSellerOrders(userId: string, page: number, limit: number, status?: string) {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) throw new ApiError(404, 'Seller profile not found');

    const where: any = { sellerId: profile.id };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.sellerOrder.findMany({
        where,
        include: {
          items: true,
          order: {
            select: {
              orderNumber: true,
              shippingFullName: true,
              shippingCity: true,
              createdAt: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sellerOrder.count({ where }),
    ]);

    return {
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.order.orderNumber,
        customerName: o.order.shippingFullName,
        location: o.order.shippingCity,
        status: o.status,
        date: o.createdAt,
        total: o.totalInPesewas / 100,
        items: o.items.length,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    };
  }

  /**
   * Update Seller Order Status
   */
  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) throw new ApiError(404, 'Seller profile not found');

    const order = await prisma.sellerOrder.findUnique({
      where: { id: orderId },
    });

    if (!order || order.sellerId !== profile.id) {
      throw new ApiError(404, 'Order not found');
    }

    return await prisma.sellerOrder.update({
      where: { id: orderId },
      data: { status },
    });
  }
}
