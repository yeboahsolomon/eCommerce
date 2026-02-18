import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
const productImagesDir = path.join(uploadsDir, 'products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(productImagesDir)) {
  fs.mkdirSync(productImagesDir, { recursive: true });
}

// ==================== MULTER CONFIGURATION ====================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productImagesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter - only allow images
const imageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Single image upload (max 5MB)
export const uploadSingleImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('image');

// Multiple images upload (max 5 images, 5MB each)
export const uploadMultipleImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5, // Maximum 5 files
  },
}).array('images', 5);

// Error handling wrapper for multer
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 images.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Upload failed.',
    });
  }
  
  next();
};

// Helper to delete an uploaded file
export const deleteUploadedFile = (filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const filepath = path.join(productImagesDir, filename);
    fs.unlink(filepath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// ==================== SELLER DOCUMENT UPLOAD ====================

const sellerDocsDir = path.join(uploadsDir, 'seller-docs');
if (!fs.existsSync(sellerDocsDir)) {
  fs.mkdirSync(sellerDocsDir, { recursive: true });
}

const sellerDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, sellerDocsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter - allow images AND PDFs for document uploads
const documentFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png',
    'application/pdf',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF documents are allowed.'));
  }
};

// Seller document upload (Ghana Card + Business Registration, max 5MB each)
export const uploadSellerDocuments = multer({
  storage: sellerDocStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 2, // Max 2 files (Ghana Card + optional business reg)
  },
}).fields([
  { name: 'ghanaCardImage', maxCount: 1 },
  { name: 'businessRegImage', maxCount: 1 },
]);

// Get public URL for a seller document
export const getSellerDocUrl = (filename: string, baseUrl: string): string => {
  return `${baseUrl}/uploads/seller-docs/${filename}`;
};

// Helper to delete a seller document
export const deleteSellerDoc = (filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const filepath = path.join(sellerDocsDir, filename);
    fs.unlink(filepath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Get public URL for an uploaded file
export const getImageUrl = (filename: string, baseUrl: string): string => {
  return `${baseUrl}/uploads/products/${filename}`;
};
