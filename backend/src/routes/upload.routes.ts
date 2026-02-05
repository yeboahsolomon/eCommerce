import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireSellerOrAdmin } from '../middleware/admin.middleware.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';
import {
  uploadSingleImage,
  uploadMultipleImages,
  handleUploadError,
  deleteUploadedFile,
  getImageUrl,
} from '../middleware/multer.middleware.js';
import { prisma } from '../config/database.js';

const router = Router();

// Get base URL for images
const getBaseUrl = (req: Request): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
};

// ==================== ROUTES ====================

// Upload single image
router.post(
  '/image',
  authMiddleware,
  requireSellerOrAdmin,
  uploadLimiter,
  (req, res, next) => {
    uploadSingleImage(req, res, (err) => {
      handleUploadError(err, req, res, next);
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
      }

      const baseUrl = getBaseUrl(req);
      const imageUrl = getImageUrl(req.file.filename, baseUrl);

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          filename: req.file.filename,
          url: imageUrl,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image',
      });
    }
  }
);

// Upload multiple images
router.post(
  '/images',
  authMiddleware,
  requireSellerOrAdmin,
  uploadLimiter,
  (req, res, next) => {
    uploadMultipleImages(req, res, (err) => {
      handleUploadError(err, req, res, next);
    });
  },
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No image files provided',
        });
      }

      const baseUrl = getBaseUrl(req);
      const images = files.map((file) => ({
        filename: file.filename,
        url: getImageUrl(file.filename, baseUrl),
        size: file.size,
        mimetype: file.mimetype,
      }));

      res.json({
        success: true,
        message: `${images.length} image(s) uploaded successfully`,
        data: { images },
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload images',
      });
    }
  }
);

// Delete an uploaded image
router.delete(
  '/:filename',
  authMiddleware,
  requireSellerOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;

      // Validate filename (prevent directory traversal)
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename',
        });
      }

      await deleteUploadedFile(filename);

      res.json({
        success: true,
        message: 'Image deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete image',
      });
    }
  }
);

// Add image to a product
router.post(
  '/product/:productId',
  authMiddleware,
  requireSellerOrAdmin,
  uploadLimiter,
  (req, res, next) => {
    uploadSingleImage(req, res, (err) => {
      handleUploadError(err, req, res, next);
    });
  },
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const { isPrimary } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
      }

      // Verify product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { images: true },
      });

      if (!product) {
        // Delete the uploaded file since product doesn't exist
        await deleteUploadedFile(req.file.filename);
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      const baseUrl = getBaseUrl(req);
      const imageUrl = getImageUrl(req.file.filename, baseUrl);
      const shouldBePrimary = isPrimary === 'true' || product.images.length === 0;

      // If this is being set as primary, unset other primary images
      if (shouldBePrimary) {
        await prisma.productImage.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Create product image record
      const productImage = await prisma.productImage.create({
        data: {
          productId,
          url: imageUrl,
          isPrimary: shouldBePrimary,
          sortOrder: product.images.length,
        },
      });

      res.json({
        success: true,
        message: 'Product image added successfully',
        data: productImage,
      });
    } catch (error: any) {
      console.error('Product image upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add product image',
      });
    }
  }
);

// Delete a product image
router.delete(
  '/product/:productId/:imageId',
  authMiddleware,
  requireSellerOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const { productId, imageId } = req.params;

      const image = await prisma.productImage.findFirst({
        where: { id: imageId, productId },
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image not found',
        });
      }

      // Extract filename from URL
      const filename = path.basename(image.url);

      // Delete from filesystem
      await deleteUploadedFile(filename);

      // Delete from database
      await prisma.productImage.delete({
        where: { id: imageId },
      });

      // If this was primary, set another image as primary
      if (image.isPrimary) {
        const nextImage = await prisma.productImage.findFirst({
          where: { productId },
          orderBy: { sortOrder: 'asc' },
        });

        if (nextImage) {
          await prisma.productImage.update({
            where: { id: nextImage.id },
            data: { isPrimary: true },
          });
        }
      }

      res.json({
        success: true,
        message: 'Product image deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete product image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product image',
      });
    }
  }
);

export default router;
