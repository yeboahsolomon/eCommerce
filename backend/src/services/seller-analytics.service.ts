import prisma from '../config/database.js';
import { ApiError } from '../middleware/error.middleware.js';
import { SellerOrderStatus } from '@prisma/client';

// ============================================================
// Seller Analytics Service
// Provides sales, order, revenue, and best-seller analytics
// All monetary values returned in GHS (pesewas ÷ 100)
// ============================================================

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface SalesAnalytics {
  currency: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  period: { startDate: string; endDate: string };
}

interface OrdersAnalytics {
  totalOrders: number;
  statusBreakdown: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  };
  period: { startDate: string; endDate: string };
}

interface RevenueAnalytics {
  currency: string;
  totalRevenue: number;
  previousPeriodRevenue: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
  period: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };
}

interface BestSellerItem {
  productId: string;
  productName: string;
  productImage: string | null;
  unitsSold: number;
  revenue: number;
  trend: 'up' | 'down' | 'stable';
}

interface BestSellersAnalytics {
  currency: string;
  bestSellers: BestSellerItem[];
  period: { startDate: string; endDate: string };
}

export class SellerAnalyticsService {

  // ==================== HELPERS ====================

  /**
   * Resolve the seller profile ID from a user ID.
   * Throws 404 if the user has no seller profile.
   */
  private async resolveSellerProfile(userId: string): Promise<string> {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, 'Seller profile not found. Please create a seller account first.');
    }

    return profile.id;
  }

  /**
   * Compute the previous period of equal duration, for comparison.
   * e.g. if range is 30 days, previous period is the 30 days before that.
   */
  private getPreviousPeriod(range: DateRange): DateRange {
    const durationMs = range.endDate.getTime() - range.startDate.getTime();
    return {
      startDate: new Date(range.startDate.getTime() - durationMs),
      endDate: new Date(range.startDate.getTime()),
    };
  }

  /**
   * Calculate percentage change between two values.
   */
  private calcPercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 10000) / 100; // 2 decimal places
  }

  // ==================== SALES ====================

  /**
   * GET /api/seller/analytics/sales
   * Returns total sales amount, order count, and average order value.
   */
  async getSalesAnalytics(userId: string, range: DateRange): Promise<SalesAnalytics> {
    const sellerId = await this.resolveSellerProfile(userId);

    const [aggregate, orderCount] = await Promise.all([
      prisma.sellerOrder.aggregate({
        where: {
          sellerId,
          status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] as SellerOrderStatus[] },
          createdAt: { gte: range.startDate, lte: range.endDate },
        },
        _sum: { totalInPesewas: true },
      }),
      prisma.sellerOrder.count({
        where: {
          sellerId,
          status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] as SellerOrderStatus[] },
          createdAt: { gte: range.startDate, lte: range.endDate },
        },
      }),
    ]);

    const totalPesewas = aggregate._sum.totalInPesewas || 0;
    const totalSales = totalPesewas / 100;
    const averageOrderValue = orderCount > 0 ? Math.round(totalPesewas / orderCount) / 100 : 0;

    return {
      currency: 'GHS',
      totalSales,
      totalOrders: orderCount,
      averageOrderValue,
      period: {
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
      },
    };
  }

  // ==================== ORDERS ====================

  /**
   * GET /api/seller/analytics/orders
   * Returns order count with status breakdown.
   */
  async getOrdersAnalytics(userId: string, range: DateRange): Promise<OrdersAnalytics> {
    const sellerId = await this.resolveSellerProfile(userId);

    const dateFilter = {
      sellerId,
      createdAt: { gte: range.startDate, lte: range.endDate },
    };

    // Count all orders + individual statuses in parallel
    const [total, pending, processing, shipped, delivered, cancelled, refunded] =
      await Promise.all([
        prisma.sellerOrder.count({ where: dateFilter }),
        prisma.sellerOrder.count({ where: { ...dateFilter, status: 'PENDING' } }),
        prisma.sellerOrder.count({ where: { ...dateFilter, status: 'PROCESSING' } }),
        prisma.sellerOrder.count({ where: { ...dateFilter, status: 'SHIPPED' } }),
        prisma.sellerOrder.count({ where: { ...dateFilter, status: 'DELIVERED' } }),
        prisma.sellerOrder.count({ where: { ...dateFilter, status: 'CANCELLED' } }),
        prisma.sellerOrder.count({ where: { ...dateFilter, status: 'REFUNDED' } }),
      ]);

    return {
      totalOrders: total,
      statusBreakdown: { pending, processing, shipped, delivered, cancelled, refunded },
      period: {
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
      },
    };
  }

  // ==================== REVENUE ====================

  /**
   * GET /api/seller/analytics/revenue
   * Returns revenue with automatic period comparison.
   */
  async getRevenueAnalytics(userId: string, range: DateRange): Promise<RevenueAnalytics> {
    const sellerId = await this.resolveSellerProfile(userId);
    const previousRange = this.getPreviousPeriod(range);

    const revenueStatuses = ['PROCESSING', 'SHIPPED', 'DELIVERED'] as SellerOrderStatus[];

    const [currentAggregate, previousAggregate] = await Promise.all([
      prisma.sellerOrder.aggregate({
        where: {
          sellerId,
          status: { in: revenueStatuses },
          createdAt: { gte: range.startDate, lte: range.endDate },
        },
        _sum: { payoutAmountInPesewas: true },
      }),
      prisma.sellerOrder.aggregate({
        where: {
          sellerId,
          status: { in: revenueStatuses },
          createdAt: { gte: previousRange.startDate, lte: previousRange.endDate },
        },
        _sum: { payoutAmountInPesewas: true },
      }),
    ]);

    const currentRevenue = (currentAggregate._sum?.payoutAmountInPesewas || 0) / 100;
    const previousRevenue = (previousAggregate._sum?.payoutAmountInPesewas || 0) / 100;
    const percentageChange = this.calcPercentageChange(currentRevenue, previousRevenue);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentageChange > 0) trend = 'up';
    else if (percentageChange < 0) trend = 'down';

    return {
      currency: 'GHS',
      totalRevenue: currentRevenue,
      previousPeriodRevenue: previousRevenue,
      percentageChange,
      trend,
      period: {
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
      },
      previousPeriod: {
        startDate: previousRange.startDate.toISOString(),
        endDate: previousRange.endDate.toISOString(),
      },
    };
  }

  // ==================== BEST SELLERS ====================

  /**
   * GET /api/seller/analytics/best-sellers
   * Returns top-performing products by units sold.
   */
  async getBestSellers(userId: string, range: DateRange, limit: number = 10): Promise<BestSellersAnalytics> {
    const sellerId = await this.resolveSellerProfile(userId);
    const previousRange = this.getPreviousPeriod(range);

    // Get order items for this seller's orders in the current period
    const currentPeriodItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        sellerOrder: {
          sellerId,
          status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] as SellerOrderStatus[] },
          createdAt: { gte: range.startDate, lte: range.endDate },
        },
      },
      _sum: {
        quantity: true,
        totalPriceInPesewas: true,
      },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: limit,
    });

    if (currentPeriodItems.length === 0) {
      return {
        currency: 'GHS',
        bestSellers: [],
        period: {
          startDate: range.startDate.toISOString(),
          endDate: range.endDate.toISOString(),
        },
      };
    }

    // Get product IDs for name/image lookup
    const productIds = currentPeriodItems.map((item) => item.productId);

    // Fetch product details and previous period quantities in parallel
    const [products, previousPeriodItems] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          images: {
            take: 1,
            orderBy: { isPrimary: 'desc' },
            select: { url: true },
          },
        },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          sellerOrder: {
            sellerId,
            status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] as SellerOrderStatus[] },
            createdAt: { gte: previousRange.startDate, lte: previousRange.endDate },
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    // Build lookup maps
    const productMap = new Map(products.map((p) => [p.id, p]));
    const prevQuantityMap = new Map(
      previousPeriodItems.map((item) => [item.productId, item._sum.quantity || 0])
    );

    // Assemble best-seller list
    const bestSellers: BestSellerItem[] = currentPeriodItems.map((item) => {
      const product = productMap.get(item.productId);
      const currentUnits = item._sum.quantity || 0;
      const previousUnits = prevQuantityMap.get(item.productId) || 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (currentUnits > previousUnits) trend = 'up';
      else if (currentUnits < previousUnits) trend = 'down';

      return {
        productId: item.productId,
        productName: product?.name || 'Unknown Product',
        productImage: product?.images[0]?.url || null,
        unitsSold: currentUnits,
        revenue: (item._sum.totalPriceInPesewas || 0) / 100,
        trend,
      };
    });

    return {
      currency: 'GHS',
      bestSellers,
      period: {
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
      },
    };
  }
}
