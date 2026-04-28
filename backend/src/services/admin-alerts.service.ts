import { prisma } from '../config/database.js';

export interface AdminAlert {
  id: string;
  type: string;
  severity: 'critical' | 'attention' | 'info';
  title: string;
  message: string;
  count: number;
  link: string;
  icon: string;
  timestamp?: Date;
}

export interface AdminAlertsSummary {
  critical: AdminAlert[];
  attention: AdminAlert[];
  info: AdminAlert[];
  totalCount: number;
}

export class AdminAlertsService {
  /**
   * Aggregate all "action required" items across the platform.
   * This is the single endpoint that tells the admin "here's what needs your attention."
   */
  async getAlerts(): Promise<AdminAlertsSummary> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      // Critical
      failedPayments,
      riskyOrders,

      // Attention
      pendingApplications,
      staleApplications,
      lowStockProducts,
      pendingPayouts,
      pendingOrders,
      staleProcessingOrders,
      suspendedSellers,

      // Info
      newOrdersToday,
      newUsersToday,
      newApplicationsToday,
    ] = await Promise.all([
      // ===== CRITICAL =====
      // Failed payments that need investigation
      prisma.payment.count({
        where: { status: 'FAILED', createdAt: { gte: threeDaysAgo } },
      }),

      // Orders flagged for risk
      prisma.order.count({
        where: { internalRiskFlag: true, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      }),

      // ===== ATTENTION =====
      // All pending seller applications
      prisma.sellerApplication.count({
        where: { status: { in: ['PENDING', 'REVIEWING'] } },
      }),

      // Seller applications waiting >24h (stale)
      prisma.sellerApplication.count({
        where: {
          status: { in: ['PENDING', 'REVIEWING'] },
          createdAt: { lt: twentyFourHoursAgo },
        },
      }),

      // Products below low stock threshold
      prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM "Product"
        WHERE "trackInventory" = true 
          AND "stockQuantity" <= "lowStockThreshold" 
          AND "isActive" = true
      ` as Promise<[{ count: number }]>,

      // Pending payouts awaiting admin approval
      prisma.payout.count({
        where: { status: 'PENDING' },
      }),

      // Orders stuck in PENDING (possibly awaiting payment confirmation)
      prisma.order.count({
        where: {
          status: 'PENDING',
          createdAt: { lt: twentyFourHoursAgo },
        },
      }),

      // Orders stuck in PROCESSING for >3 days
      prisma.order.count({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: threeDaysAgo },
        },
      }),

      // Currently suspended sellers
      prisma.sellerProfile.count({
        where: {
          OR: [
            { isActive: false },
            { user: { status: 'SUSPENDED' } },
          ],
        },
      }),

      // ===== INFO =====
      // New orders today
      prisma.order.count({
        where: { createdAt: { gte: startOfToday } },
      }),

      // New user signups today
      prisma.user.count({
        where: { createdAt: { gte: startOfToday } },
      }),

      // New seller applications today
      prisma.sellerApplication.count({
        where: { createdAt: { gte: startOfToday } },
      }),
    ]);

    const lowStockCount = Array.isArray(lowStockProducts) ? lowStockProducts[0]?.count || 0 : 0;

    const critical: AdminAlert[] = [];
    const attention: AdminAlert[] = [];
    const info: AdminAlert[] = [];

    // ===== BUILD CRITICAL ALERTS =====

    if (failedPayments > 0) {
      critical.push({
        id: 'failed-payments',
        type: 'FAILED_PAYMENTS',
        severity: 'critical',
        title: 'Failed Payments',
        message: `${failedPayments} payment${failedPayments > 1 ? 's' : ''} failed in the last 3 days`,
        count: failedPayments,
        link: '/admin/orders?status=FAILED',
        icon: 'CreditCard',
      });
    }

    if (riskyOrders > 0) {
      critical.push({
        id: 'risky-orders',
        type: 'RISK_FLAGS',
        severity: 'critical',
        title: 'Flagged Orders',
        message: `${riskyOrders} order${riskyOrders > 1 ? 's' : ''} flagged for risk review`,
        count: riskyOrders,
        link: '/admin/orders',
        icon: 'ShieldAlert',
      });
    }

    // ===== BUILD ATTENTION ALERTS =====

    if (pendingApplications > 0) {
      attention.push({
        id: 'pending-applications',
        type: 'PENDING_APPLICATIONS',
        severity: 'attention',
        title: 'Pending Applications',
        message: staleApplications > 0
          ? `${pendingApplications} pending (${staleApplications} waiting >24h)`
          : `${pendingApplications} seller application${pendingApplications > 1 ? 's' : ''} to review`,
        count: pendingApplications,
        link: '/admin/applications',
        icon: 'FileText',
      });
    }

    if (lowStockCount > 0) {
      attention.push({
        id: 'low-stock',
        type: 'LOW_STOCK',
        severity: 'attention',
        title: 'Low Stock Products',
        message: `${lowStockCount} product${lowStockCount > 1 ? 's' : ''} below stock threshold`,
        count: lowStockCount,
        link: '/admin/products',
        icon: 'PackageMinus',
      });
    }

    if (pendingPayouts > 0) {
      attention.push({
        id: 'pending-payouts',
        type: 'PENDING_PAYOUTS',
        severity: 'attention',
        title: 'Pending Payouts',
        message: `${pendingPayouts} payout${pendingPayouts > 1 ? 's' : ''} awaiting approval`,
        count: pendingPayouts,
        link: '/admin/payouts',
        icon: 'Wallet',
      });
    }

    if (pendingOrders > 0) {
      attention.push({
        id: 'stale-pending-orders',
        type: 'STALE_PENDING_ORDERS',
        severity: 'attention',
        title: 'Stale Pending Orders',
        message: `${pendingOrders} order${pendingOrders > 1 ? 's' : ''} pending >24h (may need cancellation)`,
        count: pendingOrders,
        link: '/admin/orders?status=PENDING',
        icon: 'Clock',
      });
    }

    if (staleProcessingOrders > 0) {
      attention.push({
        id: 'stale-processing-orders',
        type: 'STALE_PROCESSING_ORDERS',
        severity: 'attention',
        title: 'Stale Processing Orders',
        message: `${staleProcessingOrders} order${staleProcessingOrders > 1 ? 's' : ''} stuck in processing >3 days`,
        count: staleProcessingOrders,
        link: '/admin/orders?status=PROCESSING',
        icon: 'AlertTriangle',
      });
    }

    // ===== BUILD INFO ALERTS =====

    if (newOrdersToday > 0) {
      info.push({
        id: 'new-orders-today',
        type: 'NEW_ORDERS_TODAY',
        severity: 'info',
        title: 'New Orders Today',
        message: `${newOrdersToday} new order${newOrdersToday > 1 ? 's' : ''} received today`,
        count: newOrdersToday,
        link: '/admin/orders',
        icon: 'ShoppingCart',
      });
    }

    if (newUsersToday > 0) {
      info.push({
        id: 'new-users-today',
        type: 'NEW_USERS_TODAY',
        severity: 'info',
        title: 'New Users Today',
        message: `${newUsersToday} new user${newUsersToday > 1 ? 's' : ''} signed up today`,
        count: newUsersToday,
        link: '/admin/users',
        icon: 'UserPlus',
      });
    }

    if (newApplicationsToday > 0) {
      info.push({
        id: 'new-apps-today',
        type: 'NEW_APPLICATIONS_TODAY',
        severity: 'info',
        title: 'New Applications Today',
        message: `${newApplicationsToday} new seller application${newApplicationsToday > 1 ? 's' : ''} today`,
        count: newApplicationsToday,
        link: '/admin/applications',
        icon: 'FileText',
      });
    }

    const totalCount = critical.reduce((s, a) => s + a.count, 0)
      + attention.reduce((s, a) => s + a.count, 0);

    return { critical, attention, info, totalCount };
  }

  /**
   * Quick count for the notification badge — only critical + attention items.
   */
  async getAlertCount(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const [
      failedPayments,
      riskyOrders,
      pendingApplications,
      lowStockProducts,
      pendingPayouts,
      staleOrders,
    ] = await Promise.all([
      prisma.payment.count({
        where: { status: 'FAILED', createdAt: { gte: threeDaysAgo } },
      }),
      prisma.order.count({
        where: { internalRiskFlag: true, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      }),
      prisma.sellerApplication.count({
        where: { status: { in: ['PENDING', 'REVIEWING'] } },
      }),
      prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM "Product"
        WHERE "trackInventory" = true 
          AND "stockQuantity" <= "lowStockThreshold" 
          AND "isActive" = true
      ` as Promise<[{ count: number }]>,
      prisma.payout.count({ where: { status: 'PENDING' } }),
      prisma.order.count({
        where: {
          status: 'PENDING',
          createdAt: { lt: twentyFourHoursAgo },
        },
      }),
    ]);

    const lowStockCount = Array.isArray(lowStockProducts) ? lowStockProducts[0]?.count || 0 : 0;

    return failedPayments + riskyOrders + pendingApplications + lowStockCount + pendingPayouts + staleOrders;
  }
}

export const adminAlertsService = new AdminAlertsService();
