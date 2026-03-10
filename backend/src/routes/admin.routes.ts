import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { adminRejectApplicationSchema, adminRequestInfoSchema } from '../utils/validators.js';
import { emailService } from '../services/email.service.js';
import { logAdminActivity, getActivityLogs } from '../services/admin-activity.service.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(requireAdmin);

// ==================== DASHBOARD OVERVIEW ====================

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
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

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

// Sales chart data
router.get('/analytics/sales-chart', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '30d';
    let days = 30;
    if (period === '7d') days = 7;
    if (period === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { notIn: ['CANCELLED', 'FAILED'] },
      },
      select: { createdAt: true, totalInPesewas: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build day-by-day map
    const salesByDate: Record<string, { orders: number; revenue: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      salesByDate[key] = { orders: 0, revenue: 0 };
    }

    orders.forEach((order) => {
      const key = order.createdAt.toISOString().split('T')[0];
      if (salesByDate[key]) {
        salesByDate[key].orders++;
        salesByDate[key].revenue += order.totalInPesewas;
      }
    });

    const chartData = Object.entries(salesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue / 100,
      }));

    res.json({ success: true, data: { period, days, chartData } });
  } catch (error: any) {
    console.error('Sales chart error:', error);
    res.status(500).json({ success: false, message: 'Failed to get sales chart data' });
  }
});

// Orders by status
router.get('/analytics/orders-by-status', async (req: Request, res: Response) => {
  try {
    const statuses = await prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const data = statuses.map((s) => ({
      status: s.status,
      count: s._count._all,
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Orders by status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get orders by status' });
  }
});

// Top selling categories
router.get('/analytics/top-categories', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

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

    const data = Object.entries(categoryAgg)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Top categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to get top categories' });
  }
});

// Sales by Ghana region
router.get('/analytics/by-region', async (req: Request, res: Response) => {
  try {
    const regionData = await prisma.order.groupBy({
      by: ['shippingRegion'],
      _count: { _all: true },
      _sum: { totalInPesewas: true },
      where: { status: { notIn: ['CANCELLED', 'FAILED'] } },
      orderBy: { _sum: { totalInPesewas: 'desc' } },
    });

    const data = regionData.map((r) => ({
      region: r.shippingRegion,
      orders: r._count._all,
      revenue: (r._sum.totalInPesewas || 0) / 100,
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Sales by region error:', error);
    res.status(500).json({ success: false, message: 'Failed to get sales by region' });
  }
});

// Top products
router.get('/stats/products', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

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

    res.json({
      success: true,
      data: topProducts.map((item) => {
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
      }),
    });
  } catch (error: any) {
    console.error('Top products error:', error);
    res.status(500).json({ success: false, message: 'Failed to get top products' });
  }
});

// ==================== SALES STATISTICS ====================

router.get('/stats/sales', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'week';
    let days = 7;
    if (period === 'day') days = 1;
    if (period === 'month') days = 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { notIn: ['CANCELLED', 'FAILED'] },
      },
      select: { createdAt: true, totalInPesewas: true },
    });

    const salesByDate: Record<string, { orders: number; revenue: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      salesByDate[d.toISOString().split('T')[0]] = { orders: 0, revenue: 0 };
    }

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (salesByDate[dateKey]) {
        salesByDate[dateKey].orders++;
        salesByDate[dateKey].revenue += order.totalInPesewas;
      }
    });

    const chartData = Object.entries(salesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue / 100,
      }));

    res.json({
      success: true,
      data: {
        period,
        days,
        chartData,
        totals: {
          orders: orders.length,
          revenue: orders.reduce((sum, o) => sum + o.totalInPesewas, 0) / 100,
        },
      },
    });
  } catch (error: any) {
    console.error('Sales stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get sales stats' });
  }
});

// ==================== USER MANAGEMENT ====================

router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const status = req.query.status as string;
    const role = req.query.role as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (status) where.status = status;
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { orders: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users: users.map((u) => ({
          ...u,
          orderCount: u._count.orders,
          reviewCount: u._count.reviews,
          _count: undefined,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
});

// Get user detail
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        avatarUrl: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { orders: true, reviews: true } },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalInPesewas: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        sellerProfile: {
          select: {
            id: true,
            businessName: true,
            isVerified: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: { user } });
  } catch (error: any) {
    console.error('Get user detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
});

// Update user status
router.put('/users/:userId/status', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, status: true },
    });

    const actionMap: Record<string, any> = {
      ACTIVE: 'ACTIVATE_USER',
      SUSPENDED: 'SUSPEND_USER',
      DEACTIVATED: 'DEACTIVATE_USER',
    };

    logAdminActivity({
      req,
      action: actionMap[status],
      entityType: 'user',
      entityId: userId,
      details: { newStatus: status },
    });

    res.json({
      success: true,
      message: `User ${status.toLowerCase()} successfully`,
      data: user,
    });
  } catch (error: any) {
    console.error('Update user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// Delete user (soft - deactivate)
router.delete('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Prevent deleting self
    if (userId === (req as any).user?.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: 'DEACTIVATED' },
      select: { id: true, email: true },
    });

    logAdminActivity({
      req,
      action: 'DELETE_USER',
      entityType: 'user',
      entityId: userId,
      details: { email: user.email },
    });

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// ==================== SELLER MANAGEMENT ====================

router.get('/sellers', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const status = req.query.status as string;

    const where: any = { role: 'SELLER' };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { sellerProfile: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status === 'active') {
      where.sellerProfile = { isActive: true };
    } else if (status === 'suspended') {
      where.status = 'SUSPENDED';
    } else if (status === 'inactive') {
      where.sellerProfile = { isActive: false };
    } else {
      where.sellerProfile = { isNot: null };
    }

    const [sellers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          createdAt: true,
          sellerProfile: {
            select: {
              id: true,
              businessName: true,
              slug: true,
              ghanaRegion: true,
              isVerified: true,
              isActive: true,
              commissionRate: true,
              _count: { select: { products: true, sellerOrders: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        sellers: sellers.map((s) => ({
          id: s.id,
          email: s.email,
          name: `${s.firstName} ${s.lastName}`,
          phone: s.phone,
          status: s.status,
          businessName: s.sellerProfile?.businessName,
          slug: s.sellerProfile?.slug,
          sellerId: s.sellerProfile?.id,
          ghanaRegion: s.sellerProfile?.ghanaRegion,
          isVerified: s.sellerProfile?.isVerified,
          isActive: s.sellerProfile?.isActive,
          commissionRate: s.sellerProfile?.commissionRate,
          productCount: s.sellerProfile?._count?.products || 0,
          orderCount: s.sellerProfile?._count?.sellerOrders || 0,
          joinedAt: s.createdAt,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    console.error('Get sellers error:', error);
    res.status(500).json({ success: false, message: 'Failed to get sellers' });
  }
});

// Get seller detail
router.get('/sellers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const profile = await prisma.sellerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            createdAt: true,
            sellerApplications: {
              select: { id: true, status: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        wallet: {
          select: {
            currentBalance: true,
            pendingBalance: true,
            totalEarned: true,
            totalWithdrawn: true,
          },
        },
        _count: {
          select: { products: true, sellerOrders: true, reviews: true, payouts: true },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Get total sales amount
    const salesTotal = await prisma.sellerOrder.aggregate({
      where: { sellerId: id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { totalInPesewas: true },
    });

    // Get average rating
    const avgRating = await prisma.sellerReview.aggregate({
      where: { sellerId: id },
      _avg: { rating: true },
    });

    // Recent orders
    const recentOrders = await prisma.sellerOrder.findMany({
      where: { sellerId: id },
      select: {
        id: true,
        status: true,
        totalInPesewas: true,
        createdAt: true,
        order: { select: { orderNumber: true, shippingFullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        seller: {
          ...profile,
          totalSalesInCedis: (salesTotal._sum.totalInPesewas || 0) / 100,
          averageRating: avgRating._avg.rating || 0,
          recentOrders: recentOrders.map((o) => ({
            id: o.id,
            orderNumber: o.order.orderNumber,
            customerName: o.order.shippingFullName,
            status: o.status,
            totalInCedis: o.totalInPesewas / 100,
            createdAt: o.createdAt,
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('Get seller detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to get seller details' });
  }
});

// Suspend a seller
router.put('/sellers/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const profile = await prisma.sellerProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    await prisma.$transaction([
      prisma.sellerProfile.update({ where: { id }, data: { isActive: false } }),
      prisma.user.update({ where: { id: profile.userId }, data: { status: 'SUSPENDED' } }),
    ]);

    logAdminActivity({
      req,
      action: 'SUSPEND_SELLER',
      entityType: 'seller',
      entityId: id,
      details: { reason, businessName: profile.businessName },
    });

    res.json({ success: true, message: `Seller ${profile.businessName} has been suspended.` });
  } catch (error: any) {
    console.error('Suspend seller error:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend seller' });
  }
});

// Activate a seller
router.put('/sellers/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const profile = await prisma.sellerProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    await prisma.$transaction([
      prisma.sellerProfile.update({ where: { id }, data: { isActive: true } }),
      prisma.user.update({ where: { id: profile.userId }, data: { status: 'ACTIVE' } }),
    ]);

    logAdminActivity({
      req,
      action: 'ACTIVATE_SELLER',
      entityType: 'seller',
      entityId: id,
      details: { businessName: profile.businessName },
    });

    res.json({ success: true, message: `Seller ${profile.businessName} has been activated.` });
  } catch (error: any) {
    console.error('Activate seller error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate seller' });
  }
});

// Update seller commission rate
router.put('/sellers/:id/commission-rate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 50) {
      return res.status(400).json({ success: false, message: 'Commission rate must be between 0 and 50' });
    }

    const profile = await prisma.sellerProfile.update({
      where: { id },
      data: { commissionRate },
      select: { id: true, businessName: true, commissionRate: true },
    });

    logAdminActivity({
      req,
      action: 'UPDATE_COMMISSION_RATE',
      entityType: 'seller',
      entityId: id,
      details: { newRate: commissionRate, businessName: profile.businessName },
    });

    res.json({
      success: true,
      message: `Commission rate updated to ${commissionRate}%`,
      data: profile,
    });
  } catch (error: any) {
    console.error('Update commission rate error:', error);
    res.status(500).json({ success: false, message: 'Failed to update commission rate' });
  }
});

// ==================== SELLER APPLICATION MANAGEMENT ====================

// List seller applications with filters
router.get('/seller-applications', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (search) {
      where.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { ghanaCardNumber: { contains: search } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.sellerApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sellerApplication.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        applications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    console.error('Get seller applications error:', error);
    res.status(500).json({ success: false, message: 'Failed to get applications' });
  }
});

// Get single application detail
router.get('/seller-applications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user.id;

    let application = await prisma.sellerApplication.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            _count: { select: { orders: true } },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Automatically transition to REVIEWING if admin is viewing a pending application
    if (application.status === 'PENDING') {
      application = await prisma.sellerApplication.update({
        where: { id },
        data: {
          status: 'REVIEWING',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              emailVerified: true,
              createdAt: true,
              _count: { select: { orders: true } },
            },
          },
        },
      });

      logAdminActivity({
        req,
        action: 'VIEW_APPLICATION',
        entityType: 'seller_application',
        entityId: id,
        details: { storeName: application.storeName },
      });
    }

    // Get activity logs for this application
    const activityLogs = await prisma.adminActivityLog.findMany({
      where: { entityType: 'seller_application', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ success: true, data: { application, activityLogs } });
  } catch (error: any) {
    console.error('Get application detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to get application' });
  }
});

// Approve seller application (atomic transaction)
router.post('/seller-applications/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user.id;

    const application = await prisma.sellerApplication.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Application is already approved' });
    }

    if (application.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Cannot approve a rejected application' });
    }

    // Generate slug from store name
    let slug = application.storeName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const existingSlug = await prisma.sellerProfile.findUnique({ where: { slug } });
    if (existingSlug) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    // Atomic transaction: approve application + upgrade user + create profile
    const result = await prisma.$transaction(async (tx) => {
      const updatedApp = await tx.sellerApplication.update({
        where: { id },
        data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() },
      });

      await tx.user.update({
        where: { id: application.userId },
        data: { role: 'SELLER' },
      });

      const profile = await tx.sellerProfile.create({
        data: {
          userId: application.userId,
          businessName: application.storeName,
          slug,
          businessEmail: application.businessEmail,
          businessPhone: application.businessPhone,
          businessAddress: application.businessAddress,
          ghanaRegion: application.ghanaRegion,
          mobileMoneyNumber: application.mobileMoneyNumber,
          mobileMoneyProvider: application.mobileMoneyProvider,
          isVerified: true,
          verifiedAt: new Date(),
          commissionRate: 5.0,
          wallet: { create: { currentBalance: 0, pendingBalance: 0 } },
        },
        include: { wallet: true },
      });

      return { application: updatedApp, profile };
    });

    logAdminActivity({
      req,
      action: 'APPROVE_APPLICATION',
      entityType: 'seller_application',
      entityId: id,
      details: { storeName: application.storeName, userId: application.userId },
    });

    // Send approval email (non-blocking)
    emailService.sendApplicationApprovedEmail(
      application.user.email,
      application.user.firstName,
      application.storeName,
    ).catch(console.error);

    res.json({
      success: true,
      message: `Seller application approved. ${application.user.firstName} is now a seller.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Approve application error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve application' });
  }
});

// Reject seller application
router.post('/seller-applications/:id/reject', validate(adminRejectApplicationSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).user.id;

    const application = await prisma.sellerApplication.findUnique({
      where: { id },
      include: { user: { select: { email: true, firstName: true } } },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status !== 'PENDING' && application.status !== 'INFO_REQUESTED' && application.status !== 'REVIEWING') {
      return res.status(400).json({ success: false, message: `Cannot reject an application with status: ${application.status}` });
    }

    const updated = await prisma.sellerApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    logAdminActivity({
      req,
      action: 'REJECT_APPLICATION',
      entityType: 'seller_application',
      entityId: id,
      details: { reason, storeName: application.storeName },
    });

    emailService.sendApplicationRejectedEmail(
      application.user.email,
      application.user.firstName,
      reason,
    ).catch(console.error);

    res.json({ success: true, message: 'Application rejected.', data: { application: updated } });
  } catch (error: any) {
    console.error('Reject application error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject application' });
  }
});

// Request more info from applicant
router.post('/seller-applications/:id/request-info', validate(adminRequestInfoSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = (req as any).user.id;

    const application = await prisma.sellerApplication.findUnique({
      where: { id },
      include: { user: { select: { email: true, firstName: true } } },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status !== 'PENDING' && application.status !== 'REVIEWING') {
      return res.status(400).json({ success: false, message: 'Can only request info for pending or reviewing applications' });
    }

    const updated = await prisma.sellerApplication.update({
      where: { id },
      data: {
        status: 'INFO_REQUESTED',
        adminNotes: notes,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    logAdminActivity({
      req,
      action: 'REQUEST_INFO',
      entityType: 'seller_application',
      entityId: id,
      details: { notes, storeName: application.storeName },
    });

    emailService.sendInfoRequestedEmail(
      application.user.email,
      application.user.firstName,
      notes,
    ).catch(console.error);

    res.json({ success: true, message: 'Info requested from applicant.', data: { application: updated } });
  } catch (error: any) {
    console.error('Request info error:', error);
    res.status(500).json({ success: false, message: 'Failed to request info' });
  }
});

// Update application notes
router.put('/seller-applications/:id/notes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const updated = await prisma.sellerApplication.update({
      where: { id },
      data: { adminNotes: notes },
      select: { id: true, adminNotes: true },
    });

    logAdminActivity({
      req,
      action: 'UPDATE_APPLICATION_NOTES',
      entityType: 'seller_application',
      entityId: id,
      details: { notes },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update notes error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notes' });
  }
});

// ==================== ORDER MANAGEMENT ====================

router.get('/orders', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { shippingFullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalInPesewas: true,
          shippingFullName: true,
          customerEmail: true,
          createdAt: true,
          _count: { select: { items: true } },
          payment: { select: { status: true, method: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalInCedis: o.totalInPesewas / 100,
          totalInPesewas: o.totalInPesewas,
          customerName: o.shippingFullName,
          customerEmail: o.customerEmail,
          itemCount: o._count.items,
          paymentStatus: o.payment?.status,
          paymentMethod: o.payment?.method,
          createdAt: o.createdAt,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to get orders' });
  }
});

// Update order status
router.put('/orders/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, notes } = req.body;

    const validStatuses = [
      'PENDING', 'PAYMENT_PENDING', 'CONFIRMED', 'PROCESSING',
      'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const updateData: any = { status };
    if (status === 'CONFIRMED') updateData.confirmedAt = new Date();
    if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = notes || 'Cancelled by admin';
    }
    if (notes) updateData.notes = notes;

    const order = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        select: { id: true, orderNumber: true, status: true },
      });

      if (status === 'DELIVERED') {
        // Find all non-delivered seller orders
        const sellerOrders = await tx.sellerOrder.findMany({
          where: { orderId, status: { not: 'DELIVERED' } },
          include: { seller: { include: { wallet: true } } }
        });

        // Mark them all as delivered and clear funds
        for (const sellerOrder of sellerOrders) {
          await tx.sellerOrder.update({
            where: { id: sellerOrder.id },
            data: { status: 'DELIVERED' }
          });

          const payoutAmount = sellerOrder.payoutAmountInPesewas;
          const wallet = sellerOrder.seller?.wallet;
          
          if (wallet && payoutAmount > 0) {
            await tx.sellerWallet.update({
              where: { id: wallet.id },
              data: {
                pendingBalance: { decrement: payoutAmount },
                currentBalance: { increment: payoutAmount }
              }
            });

            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                type: 'SALE_CLEARED',
                amount: payoutAmount,
                balanceBefore: wallet.currentBalance,
                balanceAfter: wallet.currentBalance + payoutAmount,
                description: `Payment cleared for delivered order #${updatedOrder.orderNumber}`,
                referenceId: sellerOrder.id
              }
            });
          }
        }
      }

      return updatedOrder;
    });

    logAdminActivity({
      req,
      action: 'UPDATE_ORDER_STATUS',
      entityType: 'order',
      entityId: orderId,
      details: { newStatus: status, notes },
    });

    res.json({ success: true, message: `Order status updated to ${status}`, data: order });
  } catch (error: any) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// ==================== INVENTORY MANAGEMENT ====================

router.get('/inventory/low-stock', async (req: Request, res: Response) => {
  try {
    const products = await prisma.$queryRaw`
      SELECT id, name, slug, sku, "stockQuantity", "lowStockThreshold"
      FROM "Product"
      WHERE "trackInventory" = true
        AND "stockQuantity" <= "lowStockThreshold"
        AND "isActive" = true
      ORDER BY "stockQuantity" ASC
      LIMIT 50
    `;

    res.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Low stock error:', error);
    res.status(500).json({ success: false, message: 'Failed to get low stock products' });
  }
});

router.put('/inventory/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { stockQuantity, reason } = req.body;
    const adminId = (req as any).user.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true, name: true },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const previousQuantity = product.stockQuantity;
    const change = stockQuantity - previousQuantity;

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({ where: { id: productId }, data: { stockQuantity } }),
      prisma.inventoryLog.create({
        data: {
          productId,
          action: change > 0 ? 'RESTOCK' : 'ADJUSTMENT',
          quantityChange: change,
          previousQuantity,
          newQuantity: stockQuantity,
          userId: adminId,
          notes: reason || 'Stock adjusted by admin',
        },
      }),
    ]);

    logAdminActivity({
      req,
      action: 'UPDATE_INVENTORY',
      entityType: 'product',
      entityId: productId,
      details: { productName: product.name, previousQuantity, newQuantity: stockQuantity, change },
    });

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: { productId, previousQuantity, newQuantity: stockQuantity, change },
    });
  } catch (error: any) {
    console.error('Update inventory error:', error);
    res.status(500).json({ success: false, message: 'Failed to update inventory' });
  }
});

// ==================== ACTIVITY LOGS ====================

router.get('/activity-logs', async (req: Request, res: Response) => {
  try {
    const result = await getActivityLogs({
      entityType: req.query.entity as string,
      entityId: req.query.entityId as string,
      adminId: req.query.adminId as string,
      action: req.query.action as string,
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to get activity logs' });
  }
});

export default router;
