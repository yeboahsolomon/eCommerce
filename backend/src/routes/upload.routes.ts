
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireSellerOrAdmin } from '../middleware/auth.middleware.js';
import { prisma } from '../config/database.js';
import { r2Service } from '../services/r2.service.js';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../middleware/error.middleware.js';

const router = Router();

// ==================== R2 ROUTES ====================

/**
 * POST /api/upload/url
 * Generate pre-signed URL for client-side upload
 */
router.post(
  '/url',
  authenticate,
  requireSellerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileName, fileType, productId } = req.body;

      if (!fileName || !fileType || !productId) {
        throw new ApiError(400, 'Missing required fields: fileName, fileType, productId');
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(fileType)) {
        throw new ApiError(400, 'Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed.');
      }

      // Verify product ownership
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Check ownership if SELLER
      if (req.user?.role === 'SELLER') {
          if (!req.user.sellerProfile) {
              throw new ApiError(403, 'Seller profile not found');
          }
           // Allow if owner OR if product has no seller (admin created?) - strictly enforce owner for now
          if (product.sellerId !== req.user.sellerProfile.id) {
            throw new ApiError(403, 'You can only upload images for your own products');
          }
      }


      const extension = fileName.split('.').pop();
      const uuid = uuidv4();
      // Structure: products/{sellerId}/{productId}/{uuid}.{ext}
      // If sellerId is null (admin), use 'admin'
      const sellerFolder = product.sellerId || 'admin';
      const key = `products/${sellerFolder}/${productId}/${uuid}.${extension}`;

      const uploadUrl = await r2Service.generateUploadUrl(key, fileType);

      res.json({
        success: true,
        data: {
          uploadUrl,
          storageKey: key,
          publicUrl: r2Service.getPublicUrl(key), // Frontend can use this for preview after upload? No, mostly for saving.
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/upload/persist
 * Save uploaded image metadata to database
 */
router.post(
  '/persist',
  authenticate,
  requireSellerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, storageKey, fileSize, mimeType, isPrimary } = req.body;

      if (!productId || !storageKey) {
        throw new ApiError(400, 'Missing required fields');
      }

       // Verify product ownership again (security)
       const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { images: true }
      });

      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      if (req.user?.role === 'SELLER') {
          if (product.sellerId !== req.user.sellerProfile?.id) {
            throw new ApiError(403, 'Unauthorized');
          }
      }

      // Construct Public URL
      const publicUrl = r2Service.getPublicUrl(storageKey);

      // Manage Primary Image Logic
      let shouldBePrimary = isPrimary;
      if (product.images.length === 0) {
        shouldBePrimary = true;
      }

      if (shouldBePrimary) {
        // Unset other primaries
        await prisma.productImage.updateMany({
            where: { productId, isPrimary: true },
            data: { isPrimary: false }
        });
      }

      const image = await prisma.productImage.create({
        data: {
          productId,
          url: publicUrl,
          storageKey,
          fileSize: fileSize || 0,
          mimeType: mimeType || 'application/octet-stream',
          isPrimary: shouldBePrimary || false,
          sortOrder: product.images.length,
        },
      });

      res.status(201).json({
        success: true,
        data: { image },
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/upload/:imageId
 * Delete image from DB and R2
 */
router.delete(
  '/:imageId',
  authenticate,
  requireSellerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageId } = req.params;

      const image = await prisma.productImage.findUnique({
        where: { id: imageId },
        include: { product: true }
      });

      if (!image) {
        throw new ApiError(404, 'Image not found');
      }

      // Verify ownership
      if (req.user?.role === 'SELLER') {
          if (image.product.sellerId !== req.user.sellerProfile?.id) {
            throw new ApiError(403, 'Unauthorized');
          }
      }

      // Delete from R2 if storageKey exists
      if (image.storageKey) {
          try {
            await r2Service.deleteFile(image.storageKey);
          } catch (e) {
              console.error("Failed to delete from R2:", e);
              // Continue to delete from DB even if R2 fails (avoid orphaned DB records)
          }
      }

      // Delete from DB
      await prisma.productImage.delete({
        where: { id: imageId },
      });

      // If deleted was primary, set new primary
      if (image.isPrimary) {
          const firstImage = await prisma.productImage.findFirst({
              where: { productId: image.productId },
              orderBy: { sortOrder: 'asc' }
          });
          if (firstImage) {
              await prisma.productImage.update({
                  where: { id: firstImage.id },
                  data: { isPrimary: true }
              });
          }
      }

      res.json({
        success: true,
        message: 'Image deleted successfully',
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/upload/reorder
 * Reorder images
 */
router.put(
    '/reorder',
    authenticate,
    requireSellerOrAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { productId, imageIds } = req.body; // Array of IDs in order

            if (!Array.isArray(imageIds)) {
                throw new ApiError(400, "Invalid imageIds format");
            }

            // Verify ownership
            const product = await prisma.product.findUnique({ where: { id: productId }});
             if (!product) throw new ApiError(404, "Product not found");
             
             if (req.user?.role === 'SELLER') {
                 if (product.sellerId !== req.user.sellerProfile?.id) {
                     throw new ApiError(403, "Unauthorized");
                 }
             }

            // Update sortOrders
            // Transaction?
            await prisma.$transaction(
                imageIds.map((id, index) => 
                    prisma.productImage.update({
                        where: { id },
                        data: { sortOrder: index }
                    })
                )
            );

            res.json({ success: true, message: "Images reordered" });

        } catch (error) {
            next(error);
        }
    }
)

export default router;
