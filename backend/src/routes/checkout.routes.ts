
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { deliveryService } from '../services/delivery.service.js';
import { cartService } from '../services/cart.service.js';

const router = Router();

/** Default weight per item when the product has no weightInGrams set */
const DEFAULT_ITEM_WEIGHT_GRAMS = 500;

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

      // Fetch seller info + product weight for delivery calc
      const productIds = cart.items.map((i: any) => i.productId);
      const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          include: { seller: { select: { id: true, ghanaRegion: true, businessAddress: true } } } 
      });

      let subtotal = 0;
      let totalShipping = 0;
      const sellerGroups: Record<string, { 
        items: any[]; 
        region: string; 
        city: string; 
        subtotal: number;
        totalWeightInGrams: number;
      }> = {};

      for (const item of cart.items) {
          const product = products.find(p => p.id === item.productId);
          if (!product) continue;
          
          const sellerId = product.sellerId || 'PLATFORM';
          if (!sellerGroups[sellerId]) {
              sellerGroups[sellerId] = { 
                  items: [], 
                  region: product.seller?.ghanaRegion || '',
                  city: product.seller?.businessAddress || '',
                  subtotal: 0,
                  totalWeightInGrams: 0,
              };
          }
          sellerGroups[sellerId].items.push(item);
          const itemTotal = product.priceInPesewas * item.quantity;
          sellerGroups[sellerId].subtotal += itemTotal;
          subtotal += itemTotal;

          // Accumulate package weight
          const itemWeight = (product.weightInGrams || DEFAULT_ITEM_WEIGHT_GRAMS) * item.quantity;
          sellerGroups[sellerId].totalWeightInGrams += itemWeight;
      }

      const sellerBreakdown = [];
      for (const [sellerId, group] of Object.entries(sellerGroups)) {
          const result = deliveryService.calculateEnhanced({
              sellerRegion: group.region,
              sellerCity: group.city,
              buyerRegion: shippingRegion || '',
              buyerCity: shippingCity || '',
              totalWeightInGrams: group.totalWeightInGrams,
          });
          
          totalShipping += result.feeInPesewas;
          sellerBreakdown.push({
              sellerId,
              subtotal: group.subtotal,
              shipping: result.feeInPesewas,
              shippingInCedis: result.feeInCedis,
              total: group.subtotal + result.feeInPesewas,
              zone: result.zone,
              zoneName: result.zoneName,
              estimatedDays: result.estimatedDays,
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

