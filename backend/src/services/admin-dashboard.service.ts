import { prisma } from '../config/database.js';

export class AdminDashboardService {
  /**
   * Get the main dashboard overview metrics
   */
  async getDashboardOverview() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [
      totalUsers,
      newUsersToday,
      totalSellers,
      pendingApplications,
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalOrders,
      ordersToday,
      pendingOrders,
      monthlyRevenue,
      lastMonthRevenue,
      recentApplications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.sellerApplication.count({ where: { status: { in: ['PENDING', 'REVIEWING'] } } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM "Product"
        WHERE "trackInventory" = true AND "stockQuantity" <= "lowStockThreshold" AND "isActive" = true
      ` as Promise<[{ count: number }]>,
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.aggregate({
        _sum: { totalInPesewas: true },
        where: { createdAt: { gte: startOfMonth }, status: { notIn: ['CANCELLED', 'FAILED'] } },
      }),
      prisma.order.aggregate({
        _sum: { totalInPesewas: true },
        where: {
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
          status: { notIn: ['CANCELLED', 'FAILED'] },
        },
      }),
      prisma.sellerApplication.findMany({
        where: { status: { in: ['PENDING', 'REVIEWING'] } },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const currentRevenue = monthlyRevenue._sum.totalInPesewas || 0;
    const previousRevenue = lastMonthRevenue._sum.totalInPesewas || 0;
    const revenueGrowth =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    const lowStockCount = Array.isArray(lowStockProducts) ? lowStockProducts[0]?.count || 0 : 0;

    return {
      users: { total: totalUsers, newToday: newUsersToday },
      sellers: { total: totalSellers, pendingApplications },
      products: { total: totalProducts, active: activeProducts, lowStock: lowStockCount },
      orders: { total: totalOrders, today: ordersToday, pending: pendingOrders },
      revenue: {
        thisMonth: currentRevenue / 100,
        lastMonth: previousRevenue / 100,
        growth: Math.round(revenueGrowth * 10) / 10,
        currency: 'GHS',
      },
      recentApplications: recentApplications.map((app) => ({
        id: app.id,
        storeName: app.storeName,
        applicantName: `${app.user.firstName} ${app.user.lastName}`,
        email: app.user.email,
        status: app.status,
        ghanaRegion: app.ghanaRegion,
        createdAt: app.createdAt,
      })),
    };
  }

  /**
   * Get sales chart data for a specific period
   */
  async getSalesChart(periodStr: string = '30d') {
    let days = 30;
    if (periodStr === '7d') days = 7;
    if (periodStr === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Build day-by-day map
    const salesByDate: Record<string, { orders: number; revenue: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      salesByDate[key] = { orders: 0, revenue: 0 };
    }

    let skip = 0;
    const limit = 5000;
    let hasMore = true;

    while (hasMore) {
      const batch = await prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { notIn: ['CANCELLED', 'FAILED'] },
        },
        select: { createdAt: true, totalInPesewas: true },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip,
      });

      batch.forEach((order) => {
        const key = order.createdAt.toISOString().split('T')[0];
        if (salesByDate[key]) {
          salesByDate[key].orders++;
          salesByDate[key].revenue += order.totalInPesewas;
        }
      });

      if (batch.length < limit) hasMore = false;
      else skip += limit;
    }

    const chartData = Object.entries(salesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue / 100,
      }));

    return { period: periodStr, days, chartData };
  }

  /**
   * Get orders grouped by status
   */
  async getOrdersByStatus() {
    const statuses = await prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return statuses.map((s) => ({
      status: s.status,
      count: s._count._all,
    }));
  }

  /**
   * Get top selling categories
   */
  async getTopCategories(limitValue: number = 10) {
    const limit = Math.min(limitValue, 20);

    const topCategories = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPriceInPesewas: true },
      orderBy: { _sum: { totalPriceInPesewas: 'desc' } },
      take: 100, // Get enough to aggregate by category
    });

    // Get product -> category mapping
    const productIds = topCategories.map((t) => t.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true, category: { select: { name: true } } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const categoryAgg: Record<string, { name: string; revenue: number; quantity: number }> = {};

    topCategories.forEach((item) => {
      const product = productMap.get(item.productId);
      if (!product) return;
      const catId = product.categoryId;
      const catName = product.category.name;
      if (!categoryAgg[catId]) {
        categoryAgg[catId] = { name: catName, revenue: 0, quantity: 0 };
      }
      categoryAgg[catId].revenue += (item._sum.totalPriceInPesewas || 0) / 100;
      categoryAgg[catId].quantity += item._sum.quantity || 0;
    });

    return Object.entries(categoryAgg)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /**
   * Get sales grouped by Ghana regions
   */
  async getSalesByRegion() {
    const regionData = await prisma.order.groupBy({
      by: ['shippingRegion'],
      _count: { _all: true },
      _sum: { totalInPesewas: true },
      where: { status: { notIn: ['CANCELLED', 'FAILED'] } },
      orderBy: { _sum: { totalInPesewas: 'desc' } },
    });

    return regionData.map((r) => ({
      region: r.shippingRegion,
      orders: r._count._all,
      revenue: (r._sum.totalInPesewas || 0) / 100,
    }));
  }

  /**
   * Get top selling products
   */
  async getTopProducts(limitValue: number = 10) {
    const limit = Math.min(limitValue, 50);

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPriceInPesewas: true },
      orderBy: { _sum: { totalPriceInPesewas: 'desc' } },
      take: limit,
    });

    const productIds = topProducts.map((t) => t.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, slug: true, stockQuantity: true, images: { take: 1, select: { url: true } } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: product?.name || 'Unknown',
        slug: product?.slug,
        image: product?.images?.[0]?.url,
        stockQuantity: product?.stockQuantity || 0,
        totalSold: item._sum.quantity || 0,
        totalRevenue: (item._sum.totalPriceInPesewas || 0) / 100,
      };
    });
  }

  /**
   * Get general sales stats with daily/weekly groupings
   */
  async getSalesStats(periodStr: string = 'week') {
    let days = 7;
    if (periodStr === 'day') days = 1;
    if (periodStr === 'month') days = 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const salesByDate: Record<string, { orders: number; revenue: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      salesByDate[d.toISOString().split('T')[0]] = { orders: 0, revenue: 0 };
    }

    let skip = 0;
    const limit = 5000;
    let hasMore = true;

    while (hasMore) {
      const batch = await prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { notIn: ['CANCELLED', 'FAILED'] },
        },
        select: { createdAt: true, totalInPesewas: true },
        take: limit,
        skip,
      });

      batch.forEach((order) => {
        const dateKey = order.createdAt.toISOString().split('T')[0];
        if (salesByDate[dateKey]) {
          salesByDate[dateKey].orders++;
          salesByDate[dateKey].revenue += order.totalInPesewas;
        }
      });

      if (batch.length < limit) hasMore = false;
      else skip += limit;
    }

    const chartData = Object.entries(salesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue / 100,
      }));

    return {
      period: periodStr,
      days,
      chartData,
      totals: {
        orders: Object.values(salesByDate).reduce((sum, val) => sum + val.orders, 0),
        revenue: Object.values(salesByDate).reduce((sum, val) => sum + val.revenue, 0) / 100,
      },
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
