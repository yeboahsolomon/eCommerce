import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { z } from 'zod';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const addToWishlistSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  note: z.string().max(200, 'Note must be under 200 characters').optional(),
});

// ==================== ROUTES ====================

// Get user's wishlist
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get or create wishlist
    let wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
                category: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 },
                  category: { select: { id: true, name: true, slug: true } },
                },
              },
            },
          },
        },
      });
    }

    // Format the response
    const items = wishlist.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      note: item.note,
      addedAt: item.createdAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        priceInCedis: item.product.priceInPesewas / 100,
        comparePriceInCedis: item.product.comparePriceInPesewas
          ? item.product.comparePriceInPesewas / 100
          : null,
        image: item.product.images[0]?.url || null,
        category: item.product.category,
        inStock: item.product.stockQuantity > 0,
        averageRating: Number(item.product.averageRating),
      },
    }));

    res.json({
      success: true,
      data: {
        id: wishlist.id,
        itemCount: items.length,
        items,
      },
    });
  } catch (error: any) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wishlist',
    });
  }
});

// Add product to wishlist
router.post(
  '/items',
  authMiddleware,
  validate(addToWishlistSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { productId, note } = req.body;

      // Check product exists and is active
      const product = await prisma.product.findFirst({
        where: { id: productId, isActive: true },
        select: { id: true, name: true },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Get or create wishlist
      let wishlist = await prisma.wishlist.findUnique({
        where: { userId },
      });

      if (!wishlist) {
        wishlist = await prisma.wishlist.create({
          data: { userId },
        });
      }

      // Check if already in wishlist
      const existingItem = await prisma.wishlistItem.findUnique({
        where: {
          wishlistId_productId: {
            wishlistId: wishlist.id,
            productId,
          },
        },
      });

      if (existingItem) {
        // Update note if provided
        if (note !== undefined) {
          await prisma.wishlistItem.update({
            where: { id: existingItem.id },
            data: { note },
          });
        }

        return res.json({
          success: true,
          message: 'Product already in wishlist',
          data: { alreadyExists: true },
        });
      }

      // Add to wishlist
      const wishlistItem = await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
          note,
        },
      });

      res.status(201).json({
        success: true,
        message: `${product.name} added to wishlist`,
        data: {
          id: wishlistItem.id,
          productId: wishlistItem.productId,
          addedAt: wishlistItem.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Add to wishlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add to wishlist',
      });
    }
  }
);

// Check if product is in wishlist
router.get(
  '/check/:productId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.params;

      const wishlist = await prisma.wishlist.findUnique({
        where: { userId },
        include: {
          items: {
            where: { productId },
            select: { id: true, createdAt: true },
          },
        },
      });

      const isInWishlist = wishlist?.items.length ? wishlist.items.length > 0 : false;

      res.json({
        success: true,
        data: {
          inWishlist: isInWishlist,
          itemId: wishlist?.items[0]?.id || null,
        },
      });
    } catch (error: any) {
      console.error('Check wishlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check wishlist',
      });
    }
  }
);

// Remove product from wishlist
router.delete(
  '/items/:productId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.params;

      const wishlist = await prisma.wishlist.findUnique({
        where: { userId },
      });

      if (!wishlist) {
        return res.status(404).json({
          success: false,
          message: 'Wishlist not found',
        });
      }

      const deleted = await prisma.wishlistItem.deleteMany({
        where: {
          wishlistId: wishlist.id,
          productId,
        },
      });

      if (deleted.count === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found in wishlist',
        });
      }

      res.json({
        success: true,
        message: 'Product removed from wishlist',
      });
    } catch (error: any) {
      console.error('Remove from wishlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove from wishlist',
      });
    }
  }
);

// Move all wishlist items to cart
router.post(
  '/move-to-cart',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      const wishlist = await prisma.wishlist.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  priceInPesewas: true,
                  stockQuantity: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (!wishlist || wishlist.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Wishlist is empty',
        });
      }

      // Get or create cart
      let cart = await prisma.cart.findUnique({
        where: { userId },
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId },
        });
      }

      let movedCount = 0;
      let skippedCount = 0;
      const skippedItems: string[] = [];

      // Move each item to cart
      for (const item of wishlist.items) {
        // Skip inactive or out of stock products
        if (!item.product.isActive || item.product.stockQuantity === 0) {
          skippedCount++;
          skippedItems.push(item.product.name);
          continue;
        }

        // Check if already in cart
        const existingCartItem = await prisma.cartItem.findUnique({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId: item.productId,
            },
          },
        });

        if (!existingCartItem) {
          await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              productId: item.productId,
              quantity: 1,
              priceAtAddInPesewas: item.product.priceInPesewas,
            },
          });
          movedCount++;
        } else {
          // Item already in cart, just remove from wishlist
          movedCount++;
        }
      }

      // Clear wishlist
      await prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id },
      });

      res.json({
        success: true,
        message: `Moved ${movedCount} item(s) to cart`,
        data: {
          movedCount,
          skippedCount,
          skippedItems,
        },
      });
    } catch (error: any) {
      console.error('Move to cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to move items to cart',
      });
    }
  }
);

// Clear entire wishlist
router.delete('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      return res.json({
        success: true,
        message: 'Wishlist already empty',
      });
    }

    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id },
    });

    res.json({
      success: true,
      message: 'Wishlist cleared',
    });
  } catch (error: any) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist',
    });
  }
});

export default router;
