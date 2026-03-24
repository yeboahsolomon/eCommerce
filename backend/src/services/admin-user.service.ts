import { prisma } from '../config/database.js';
import { logAdminActivity } from './admin-activity.service.js';

export class AdminUserService {
  /**
   * Get a paginated list of users with optional filtering
   */
  async getUsers(page: number = 1, limitValue: number = 20, search?: string, status?: string, role?: string) {
    const limit = Math.min(limitValue, 100);
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

    return {
      users: users.map((u) => ({
        ...u,
        orderCount: u._count.orders,
        reviewCount: u._count.reviews,
        _count: undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get exhaustive user details including recent orders and seller profile
   */
  async getUserDetail(userId: string) {
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
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update a user's status (e.g. ACTIVE, SUSPENDED, DEACTIVATED)
   */
  async updateUserStatus(userId: string, status: string, req: any) {
    if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      throw new Error('Invalid status');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: status as 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' },
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

    return user;
  }

  /**
   * Perform a soft-delete (deactivation) of a user
   */
  async deactivateUser(userId: string, req: any) {
    // Prevent deleting self
    if (userId === req.user?.id) {
      throw new Error('Cannot delete your own account');
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

    return true;
  }
}

export const adminUserService = new AdminUserService();
