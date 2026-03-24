import { prisma } from '../config/database.js';
import { logAdminActivity } from './admin-activity.service.js';
import { emailService } from './email.service.js';

export class AdminSellerService {
  async getSellers(page: number = 1, limitValue: number = 20, search?: string, status?: string) {
    const limit = Math.min(limitValue, 100);
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

    return {
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
    };
  }

  async getSellerDetail(sellerProfileId: string) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
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
      throw new Error('Seller not found');
    }

    const salesTotal = await prisma.sellerOrder.aggregate({
      where: { sellerId: sellerProfileId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { totalInPesewas: true },
    });

    const avgRating = await prisma.sellerReview.aggregate({
      where: { sellerId: sellerProfileId },
      _avg: { rating: true },
    });

    const recentOrders = await prisma.sellerOrder.findMany({
      where: { sellerId: sellerProfileId },
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

    return {
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
    };
  }

  async suspendSeller(sellerProfileId: string, reason: string, req: any) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    if (!profile) throw new Error('Seller not found');

    await prisma.$transaction([
      prisma.sellerProfile.update({ where: { id: sellerProfileId }, data: { isActive: false } }),
      prisma.user.update({ where: { id: profile.userId }, data: { status: 'SUSPENDED' } }),
    ]);

    logAdminActivity({
      req,
      action: 'SUSPEND_SELLER',
      entityType: 'seller',
      entityId: sellerProfileId,
      details: { reason, businessName: profile.businessName },
    });

    return profile;
  }

  async activateSeller(sellerProfileId: string, req: any) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    if (!profile) throw new Error('Seller not found');

    await prisma.$transaction([
      prisma.sellerProfile.update({ where: { id: sellerProfileId }, data: { isActive: true } }),
      prisma.user.update({ where: { id: profile.userId }, data: { status: 'ACTIVE' } }),
    ]);

    logAdminActivity({
      req,
      action: 'ACTIVATE_SELLER',
      entityType: 'seller',
      entityId: sellerProfileId,
      details: { businessName: profile.businessName },
    });

    return profile;
  }

  async updateCommissionRate(sellerProfileId: string, commissionRate: number, req: any) {
    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 50) {
      throw new Error('Commission rate must be between 0 and 50');
    }

    const profile = await prisma.sellerProfile.update({
      where: { id: sellerProfileId },
      data: { commissionRate },
      select: { id: true, businessName: true, commissionRate: true },
    });

    logAdminActivity({
      req,
      action: 'UPDATE_COMMISSION_RATE',
      entityType: 'seller',
      entityId: sellerProfileId,
      details: { newRate: commissionRate, businessName: profile.businessName },
    });

    return profile;
  }

  async getApplications(page: number = 1, limitValue: number = 20, status?: string, search?: string) {
    const limit = Math.min(limitValue, 100);
    const where: any = {};

    if (status) where.status = status.toUpperCase();
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
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sellerApplication.count({ where }),
    ]);

    return { applications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getApplicationDetail(applicationId: string, req: any) {
    const adminId = req.user.id;

    let application = await prisma.sellerApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true, email: true, firstName: true, lastName: true, phone: true, role: true, emailVerified: true, createdAt: true,
            _count: { select: { orders: true } },
          },
        },
      },
    });

    if (!application) throw new Error('Application not found');

    if (application.status === 'PENDING') {
      application = await prisma.sellerApplication.update({
        where: { id: applicationId },
        data: { status: 'REVIEWING', reviewedBy: adminId, reviewedAt: new Date() },
        include: {
          user: {
            select: {
              id: true, email: true, firstName: true, lastName: true, phone: true, role: true, emailVerified: true, createdAt: true,
              _count: { select: { orders: true } },
            },
          },
        },
      });

      logAdminActivity({
        req,
        action: 'VIEW_APPLICATION',
        entityType: 'seller_application',
        entityId: applicationId,
        details: { storeName: application.storeName },
      });
    }

    const activityLogs = await prisma.adminActivityLog.findMany({
      where: { entityType: 'seller_application', entityId: applicationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { application, activityLogs };
  }

  async approveApplication(applicationId: string, req: any) {
    const adminId = req.user.id;

    const application = await prisma.sellerApplication.findUnique({
      where: { id: applicationId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    if (!application) throw new Error('Application not found');
    if (application.status === 'APPROVED') throw new Error('Application is already approved');
    if (application.status === 'REJECTED') throw new Error('Cannot approve a rejected application');

    let slug = application.storeName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

    const existingSlug = await prisma.sellerProfile.findUnique({ where: { slug } });
    if (existingSlug) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedApp = await tx.sellerApplication.update({
        where: { id: applicationId },
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
      entityId: applicationId,
      details: { storeName: application.storeName, userId: application.userId },
    });

    emailService.sendApplicationApprovedEmail(
      application.user.email,
      application.user.firstName,
      application.storeName
    ).catch(console.error);

    return result;
  }

  async rejectApplication(applicationId: string, reason: string, req: any) {
    const adminId = req.user.id;

    const application = await prisma.sellerApplication.findUnique({
      where: { id: applicationId },
      include: { user: { select: { email: true, firstName: true } } },
    });

    if (!application) throw new Error('Application not found');
    if (application.status !== 'PENDING' && application.status !== 'INFO_REQUESTED' && application.status !== 'REVIEWING') {
      throw new Error(`Cannot reject an application with status: ${application.status}`);
    }

    const updated = await prisma.sellerApplication.update({
      where: { id: applicationId },
      data: { status: 'REJECTED', rejectionReason: reason, reviewedBy: adminId, reviewedAt: new Date() },
    });

    logAdminActivity({
      req,
      action: 'REJECT_APPLICATION',
      entityType: 'seller_application',
      entityId: applicationId,
      details: { reason, storeName: application.storeName },
    });

    emailService.sendApplicationRejectedEmail(application.user.email, application.user.firstName, reason).catch(console.error);

    return { application: updated };
  }

  async requestInfo(applicationId: string, notes: string, req: any) {
    const adminId = req.user.id;

    const application = await prisma.sellerApplication.findUnique({
      where: { id: applicationId },
      include: { user: { select: { email: true, firstName: true } } },
    });

    if (!application) throw new Error('Application not found');
    if (application.status !== 'PENDING' && application.status !== 'REVIEWING') {
      throw new Error('Can only request info for pending or reviewing applications');
    }

    const updated = await prisma.sellerApplication.update({
      where: { id: applicationId },
      data: { status: 'INFO_REQUESTED', adminNotes: notes, reviewedBy: adminId, reviewedAt: new Date() },
    });

    logAdminActivity({
      req,
      action: 'REQUEST_INFO',
      entityType: 'seller_application',
      entityId: applicationId,
      details: { notes, storeName: application.storeName },
    });

    emailService.sendInfoRequestedEmail(application.user.email, application.user.firstName, notes).catch(console.error);

    return { application: updated };
  }

  async updateApplicationNotes(applicationId: string, notes: string, req: any) {
    const updated = await prisma.sellerApplication.update({
      where: { id: applicationId },
      data: { adminNotes: notes },
      select: { id: true, adminNotes: true },
    });

    logAdminActivity({
      req,
      action: 'UPDATE_APPLICATION_NOTES',
      entityType: 'seller_application',
      entityId: applicationId,
      details: { notes },
    });

    return updated;
  }
}

export const adminSellerService = new AdminSellerService();
