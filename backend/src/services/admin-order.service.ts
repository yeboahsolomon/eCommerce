import { prisma } from '../config/database.js';
import { logAdminActivity } from './admin-activity.service.js';

export class AdminOrderService {
  async getOrders(page: number = 1, limitValue: number = 20, status?: string, search?: string) {
    const limit = Math.min(limitValue, 100);
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

    return {
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
    };
  }

  async updateOrderStatus(orderId: string, status: string, trackingNumber?: string, notes?: string, req?: any) {
    const validStatuses = [
      'PENDING', 'PAYMENT_PENDING', 'CONFIRMED', 'PROCESSING',
      'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED',
    ];

    if (!validStatuses.includes(status)) {
      throw new Error('Invalid order status');
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
        const sellerOrders = await tx.sellerOrder.findMany({
          where: { orderId, status: { not: 'DELIVERED' } },
          include: { seller: { include: { wallet: true } } },
        });

        for (const sellerOrder of sellerOrders) {
          await tx.sellerOrder.update({
            where: { id: sellerOrder.id },
            data: { status: 'DELIVERED' },
          });

          const payoutAmount = sellerOrder.payoutAmountInPesewas;
          const wallet = sellerOrder.seller?.wallet;

          if (wallet && payoutAmount > 0) {
            await tx.sellerWallet.update({
              where: { id: wallet.id },
              data: {
                pendingBalance: { decrement: payoutAmount },
                currentBalance: { increment: payoutAmount },
              },
            });

            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                type: 'SALE_CLEARED',
                amount: payoutAmount,
                balanceBefore: wallet.currentBalance,
                balanceAfter: wallet.currentBalance + payoutAmount,
                description: `Payment cleared for delivered order #${updatedOrder.orderNumber}`,
                referenceId: sellerOrder.id,
              },
            });
          }
        }
      }

      return updatedOrder;
    });

    if (req) {
      logAdminActivity({
        req,
        action: 'UPDATE_ORDER_STATUS',
        entityType: 'order',
        entityId: orderId,
        details: { newStatus: status, notes },
      });
    }

    return order;
  }
}

export const adminOrderService = new AdminOrderService();
