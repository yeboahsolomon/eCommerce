import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { emailService } from '../services/email.service.js';
import { config } from '../config/env.js';
import { validate } from '../middleware/validate.middleware.js';
import { adminRejectApplicationSchema, adminRequestInfoSchema } from '../utils/validators.js';
const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(requireAdmin);

// ==================== DASHBOARD OVERVIEW ====================

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Get key metrics
    const [
      totalUsers,
      newUsersToday,
      totalProducts,
      activeProducts,
      totalOrders,
      ordersToday,
      pendingOrders,
      monthlyRevenue,
      lastMonthRevenue,
      lowStockProducts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PAYMENT_PENDING'] } } }),
      prisma.order.aggregate({
        where: {
          status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalInPesewas: true },
      }),
      prisma.order.aggregate({
        where: {
          status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
        _sum: { totalInPesewas: true },
      }),
      prisma.product.count({
        where: {
          trackInventory: true,
          stockQuantity: { lte: prisma.product.fields.lowStockThreshold },
        },
      }),
    ]);

    const currentRevenue = monthlyRevenue._sum.totalInPesewas || 0;
    const previousRevenue = lastMonthRevenue._sum.totalInPesewas || 0;
    const revenueGrowth =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          lowStock: lowStockProducts,
        },
        orders: {
          total: totalOrders,
          today: ordersToday,
          pending: pendingOrders,
        },
        revenue: {
          thisMonth: currentRevenue / 100, // Convert to cedis
          lastMonth: previousRevenue / 100,
          growth: Math.round(revenueGrowth * 10) / 10, // Round to 1 decimal
          currency: 'GHS',
        },
      },
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
    });
  }
});

// ==================== SALES STATISTICS ====================

router.get('/stats/sales', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'week'; // day, week, month
    const today = new Date();
    let days = 7;
    
    if (period === 'day') days = 1;
    if (period === 'month') days = 30;

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    // Get daily sales for the period
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'PROCESSING'] },
      },
      select: {
        createdAt: true,
        totalInPesewas: true,
      },
    });

    // Group by date
    const salesByDate: Record<string, { orders: number; revenue: number }> = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      salesByDate[dateKey] = { orders: 0, revenue: 0 };
    }

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (salesByDate[dateKey]) {
        salesByDate[dateKey].orders++;
        salesByDate[dateKey].revenue += order.totalInPesewas;
      }
    });

    // Convert to array for charting
    const chartData = Object.entries(salesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue / 100, // Convert to cedis
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
    res.status(500).json({
      success: false,
      message: 'Failed to get sales stats',
    });
  }
});

// ==================== TOP PRODUCTS ====================

router.get('/stats/products', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // Get top selling products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPriceInPesewas: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        priceInPesewas: true,
        stockQuantity: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
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
          image: product?.images[0]?.url || null,
          priceInCedis: (product?.priceInPesewas || 0) / 100,
          stockQuantity: product?.stockQuantity || 0,
          totalSold: item._sum.quantity || 0,
          totalRevenue: (item._sum.totalPriceInPesewas || 0) / 100,
        };
      }),
    });
  } catch (error: any) {
    console.error('Top products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top products',
    });
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

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

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
          _count: { select: { orders: true } },
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
          _count: undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
    });
  }
});

// Update user status
router.put('/users/:userId/status', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, status: true },
    });

    res.json({
      success: true,
      message: `User ${status.toLowerCase()} successfully`,
      data: user,
    });
  } catch (error: any) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
    });
  }
});

// ==================== SELLER MANAGEMENT ====================

router.get('/sellers', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const isVerified = req.query.isVerified; // 'true', 'false', or undefined

    const where: any = {
      role: 'SELLER',
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { sellerProfile: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (isVerified !== undefined) {
      where.sellerProfile = {
        isVerified: isVerified === 'true',
      };
    } else {
      // Ensure they HAVE a profile
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
            include: {
              _count: { select: { products: true, sellerOrders: true } }
            }
          },
          _count: { select: { orders: true } }, // Buyer orders
          // To get seller orders count, we need to query SellerOrder separate or via relation if it exists on User? 
          // SellerProfile has relation to SellerOrder? No, SellerProfile(id) -> SellerOrder(sellerId).
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
          sellerId: s.sellerProfile?.id,
          isVerified: s.sellerProfile?.isVerified,
          joinedAt: s.createdAt,
          productCount: s.sellerProfile?._count?.products || 0,
          salesCount: s.sellerProfile?._count?.sellerOrders || 0,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get sellers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sellers',
    });
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
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
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

    const application = await prisma.sellerApplication.findUnique({
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

    res.json({ success: true, data: { application } });
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

    // Handle slug duplicates
    const existingSlug = await prisma.sellerProfile.findUnique({ where: { slug } });
    if (existingSlug) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    // Atomic transaction: approve application + upgrade user + create profile
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update application status
      const updatedApp = await tx.sellerApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      // 2. Update user role to SELLER
      await tx.user.update({
        where: { id: application.userId },
        data: { role: 'SELLER' },
      });

      // 3. Create SellerProfile with wallet
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
          commissionRate: 5.0, // Default 5% commission
          wallet: {
            create: {
              currentBalance: 0,
              pendingBalance: 0,
            },
          },
        },
        include: { wallet: true },
      });

      return { application: updatedApp, profile };
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

    if (application.status !== 'PENDING' && application.status !== 'INFO_REQUESTED') {
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

    // Send rejection email (non-blocking)
    emailService.sendApplicationRejectedEmail(
      application.user.email,
      application.user.firstName,
      reason,
    ).catch(console.error);

    res.json({
      success: true,
      message: 'Application rejected.',
      data: { application: updated },
    });
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

    if (application.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Can only request info for pending applications` });
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

    // Send info request email (non-blocking)
    emailService.sendInfoRequestedEmail(
      application.user.email,
      application.user.firstName,
      notes,
    ).catch(console.error);

    res.json({
      success: true,
      message: 'Info requested from applicant.',
      data: { application: updated },
    });
  } catch (error: any) {
    console.error('Request info error:', error);
    res.status(500).json({ success: false, message: 'Failed to request info' });
  }
});

// ==================== SELLER MANAGEMENT (Enhanced) ====================

// Suspend a seller
router.put('/sellers/:id/suspend', async (req: Request, res: Response) => {
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
      prisma.sellerProfile.update({
        where: { id },
        data: { isActive: false },
      }),
      prisma.user.update({
        where: { id: profile.userId },
        data: { status: 'SUSPENDED' },
      }),
    ]);

    res.json({
      success: true,
      message: `Seller ${profile.businessName} has been suspended.`,
    });
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
      prisma.sellerProfile.update({
        where: { id },
        data: { isActive: true },
      }),
      prisma.user.update({
        where: { id: profile.userId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    res.json({
      success: true,
      message: `Seller ${profile.businessName} has been activated.`,
    });
  } catch (error: any) {
    console.error('Activate seller error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate seller' });
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

    if (status) {
      where.status = status;
    }

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
          payment: {
            select: { status: true, method: true },
          },
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
          customerName: o.shippingFullName,
          customerEmail: o.customerEmail,
          itemCount: o._count.items,
          paymentStatus: o.payment?.status,
          paymentMethod: o.payment?.method,
          createdAt: o.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
    });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid order status',
      });
    }

    const updateData: any = { status };

    // Auto-set timestamps
    if (status === 'CONFIRMED') updateData.confirmedAt = new Date();
    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
    }
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = notes || 'Cancelled by admin';
    }
    if (notes) updateData.notes = notes;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      select: { id: true, orderNumber: true, status: true },
    });

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order,
    });
  } catch (error: any) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
    });
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

    res.json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error('Low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get low stock products',
    });
  }
});

// Update product inventory
router.put('/inventory/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { stockQuantity, reason } = req.body;
    const adminId = (req as any).user.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const previousQuantity = product.stockQuantity;
    const change = stockQuantity - previousQuantity;

    // Update product and log the change
    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stockQuantity },
      }),
      prisma.inventoryLog.create({
        data: {
          productId,
          action: change > 0 ? 'RESTOCK' : 'ADJUSTMENT',
          quantityChange: change,
          previousQuantity,
          newQuantity: stockQuantity,
          userId: adminId,
          notes: reason || `Stock adjusted by admin`,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: {
        productId,
        previousQuantity,
        newQuantity: stockQuantity,
        change,
      },
    });
  } catch (error: any) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory',
    });
  }
});

export default router;
