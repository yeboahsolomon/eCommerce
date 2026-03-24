import { prisma } from '../config/database.js';
import { logAdminActivity } from './admin-activity.service.js';

export class AdminInventoryService {
  async getLowStockProducts() {
    return prisma.$queryRaw`
      SELECT id, name, slug, sku, "stockQuantity", "lowStockThreshold"
      FROM "Product"
      WHERE "trackInventory" = true
        AND "stockQuantity" <= "lowStockThreshold"
        AND "isActive" = true
      ORDER BY "stockQuantity" ASC
      LIMIT 50
    `;
  }

  async updateStock(productId: string, stockQuantity: number, reason: string, req: any) {
    const adminId = req.user.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true, name: true },
    });

    if (!product) {
      throw new Error('Product not found');
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

    return { productId, previousQuantity, newQuantity: stockQuantity, change };
  }
}

export const adminInventoryService = new AdminInventoryService();
