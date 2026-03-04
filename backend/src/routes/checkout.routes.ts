
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { deliveryService } from '../services/delivery.service.js';
import { cartService } from '../services/cart.service.js';

const router = Router();

/**
 * POST /api/checkout/calculate
 * Calculate totals including delivery fees per seller.
 * This is purely a preview — actual order creation goes through POST /api/orders.
 */
router.post(
  '/calculate',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shippingRegion, shippingCity } = req.body;
      const userId = (req as any).user?.id || null;
      const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
      
      const cart = await cartService.getCart(userId, sessionId);
      
      if (!cart || cart.items.length === 0) {
        return res.json({ success: true, data: { subtotal: 0, shipping: 0, total: 0, sellers: [] } });
      }

      // Fetch seller info for delivery calc
      const productIds = cart.items.map((i: any) => i.productId);
      const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          include: { seller: { select: { id: true, ghanaRegion: true, businessAddress: true } } } 
      });

      let subtotal = 0;
      let totalShipping = 0;
      const sellerGroups: Record<string, { items: any[]; region: string; city: string; subtotal: number }> = {};

      for (const item of cart.items) {
          const product = products.find(p => p.id === item.productId);
          if (!product) continue;
          
          const sellerId = product.sellerId || 'PLATFORM';
          if (!sellerGroups[sellerId]) {
              sellerGroups[sellerId] = { 
                  items: [], 
                  region: product.seller?.ghanaRegion || '',
                  city: product.seller?.businessAddress || '',
                  subtotal: 0 
              };
          }
          sellerGroups[sellerId].items.push(item);
          const itemTotal = product.priceInPesewas * item.quantity;
          sellerGroups[sellerId].subtotal += itemTotal;
          subtotal += itemTotal;
      }

      const sellerBreakdown = [];
      for (const [sellerId, group] of Object.entries(sellerGroups)) {
          const fee = deliveryService.calculateFee(
              group.region,
              group.city,
              shippingRegion || '',
              shippingCity || ''
          );
          
          totalShipping += fee;
          sellerBreakdown.push({
              sellerId,
              subtotal: group.subtotal,
              shipping: fee,
              shippingInCedis: fee / 100,
              total: group.subtotal + fee
          });
      }

      res.json({
        success: true,
        data: {
            subtotal,
            shipping: totalShipping,
            total: subtotal + totalShipping,
            sellers: sellerBreakdown,
            subtotalInCedis: subtotal / 100,
            shippingInCedis: totalShipping / 100,
            totalInCedis: (subtotal + totalShipping) / 100
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;

