import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { generalLimiter, authLimiter } from './middleware/rate-limit.middleware.js';
import { sanitizeBody } from './middleware/sanitize.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/products.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/orders.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import reviewRoutes from './routes/reviews.routes.js';
import adminRoutes from './routes/admin.routes.js';
import searchRoutes from './routes/search.routes.js';
import sellerRoutes from './routes/seller.routes.js';
import sellerAnalyticsRoutes from './routes/seller-analytics.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();

// ==================== MIDDLEWARE ====================

// Request logging (development only)
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow image loading
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Compression for responses
app.use(compression());
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitize all string inputs (XSS prevention)
app.use(sanitizeBody);

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// General rate limiting (100 req/min for most routes)
app.use('/api', generalLimiter);

// ==================== ROUTES ====================

// Health check (no rate limit)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'eCommerce API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'authentication',
      'products',
      'cart',
      'orders',
      'payments (MTN MoMo)',
      'wishlist',
      'reviews',
      'search',
      'admin dashboard',
    ],
  });
});

// Auth routes (stricter rate limit)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', authLimiter, userRoutes);

// Core API routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// New feature routes
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/search', searchRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Seller analytics routes (mounted BEFORE /api/seller to avoid /:slug catch-all)
app.use('/api/seller/analytics', sellerAnalyticsRoutes);

// Seller routes
app.use('/api/seller', sellerRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ==================== SERVER ====================

app.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🛒 GhanaMarket eCommerce API Server v2.0                ║
║                                                           ║
║   📍 Local:    http://localhost:${config.port}                    ║
║   🔐 Mode:     ${config.nodeEnv.padEnd(15)}                      ║
║                                                           ║
║   📚 API Endpoints:                                       ║
║   • Auth:      /api/auth                                  ║
║   • Products:  /api/products                              ║
║   • Cart:      /api/cart                                  ║
║   • Orders:    /api/orders                                ║
║   • Payments:  /api/payments (MTN MoMo)                   ║
║   • Wishlist:  /api/wishlist                              ║
║   • Reviews:   /api/reviews                               ║
║   • Search:    /api/search                                ║
║   • Analytics: /api/seller/analytics                      ║
║   • Admin:     /api/admin                                 ║
║   • Upload:    /api/upload                                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
