/**
 * Search Routes Tests
 * Tests: main search, suggestions, popular searches, validation, filters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  mockPrisma,
  resetAllMocks,
} from './test-helpers.js';

// ==================== MOCKS ====================

vi.mock('../config/database.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock rate-limit middleware to pass through
vi.mock('../middleware/rate-limit.middleware.js', () => ({
  searchLimiter: (_req: any, _res: any, next: any) => next(),
  generalLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
}));

// Mock cache middleware to pass through
vi.mock('../middleware/cache.middleware.js', () => ({
  cacheSearch: (_req: any, _res: any, next: any) => next(),
}));

import searchRoutes from '../routes/search.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

// ==================== APP SETUP ====================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/search', searchRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const testSearchProduct = {
  id: 'prod-search-1',
  name: 'Nike Air Max 90',
  slug: 'nike-air-max-90',
  description: 'Classic running shoes with Air cushioning',
  priceInPesewas: 120000,
  comparePriceInPesewas: 150000,
  stockQuantity: 25,
  averageRating: 4.2,
  reviewCount: 8,
  isFeatured: false,
  isActive: true,
  metaTitle: null,
  metaDescription: null,
  categoryId: 'cat-shoes-1',
  images: [{ url: '/uploads/nike-air-max.jpg' }],
  category: { id: 'cat-shoes-1', name: 'Shoes', slug: 'shoes' },
};

// ==================== TESTS ====================

describe('Search Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAllMocks();
    app = createApp();
  });

  // ===== MAIN SEARCH =====

  describe('GET /api/search', () => {
    it('should return search results for a valid query', async () => {
      mockPrisma.product.findMany.mockResolvedValue([testSearchProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const res = await request(app).get('/api/search?q=nike');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].name).toBe('Nike Air Max 90');
      expect(res.body.data.results[0].priceInCedis).toBe(1200);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('should return empty results for non-matching query', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const res = await request(app).get('/api/search?q=zyxnonexistent');

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(0);
      expect(res.body.data.pagination.total).toBe(0);
    });

    it('should return 400 for missing query parameter', async () => {
      const res = await request(app).get('/api/search');
      expect(res.status).toBe(400);
    });

    it('should apply price filters', async () => {
      mockPrisma.product.findMany.mockResolvedValue([testSearchProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const res = await request(app).get('/api/search?q=shoes&minPrice=10000&maxPrice=200000');

      expect(res.status).toBe(200);
      expect(res.body.data.filters.minPrice).toBe(100); // 10000 pesewas = ₵100
      expect(res.body.data.filters.maxPrice).toBe(2000);
    });

    it('should apply category filter', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'cat-shoes-1',
        name: 'Shoes',
        slug: 'shoes',
        children: [],
      });
      mockPrisma.product.findMany.mockResolvedValue([testSearchProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const res = await request(app).get('/api/search?q=air&category=shoes');

      expect(res.status).toBe(200);
      expect(res.body.data.filters.category).toBe('shoes');
    });

    it('should sort by price ascending', async () => {
      mockPrisma.product.findMany.mockResolvedValue([testSearchProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const res = await request(app).get('/api/search?q=shoes&sort=price_asc');

      expect(res.status).toBe(200);
      expect(res.body.data.filters.sort).toBe('price_asc');

      // Verify orderBy includes priceInPesewas: 'asc'
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      const hasAscSort = findManyCall.orderBy.some(
        (o: Record<string, string>) => o.priceInPesewas === 'asc'
      );
      expect(hasAscSort).toBe(true);
    });

    it('should paginate results', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(50);

      const res = await request(app).get('/api/search?q=shoes&page=3&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(3);
      expect(res.body.data.pagination.pages).toBe(5);

      // Verify skip/take
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.skip).toBe(20); // (3-1) * 10
      expect(findManyCall.take).toBe(10);
    });
  });

  // ===== SEARCH SUGGESTIONS =====

  describe('GET /api/search/suggestions', () => {
    it('should return product and category suggestions', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Nike Air Max', slug: 'nike-air-max' },
        { id: 'p2', name: 'Nike Free Run', slug: 'nike-free-run' },
      ]);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'c1', name: 'Nike Shoes', slug: 'nike-shoes' },
      ]);

      const res = await request(app).get('/api/search/suggestions?q=nike');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suggestions).toHaveLength(3);

      // Products come first
      expect(res.body.data.suggestions[0].type).toBe('product');
      expect(res.body.data.suggestions[2].type).toBe('category');
    });

    it('should return empty suggestions for short query', async () => {
      const res = await request(app).get('/api/search/suggestions?q=n');

      expect(res.status).toBe(200);
      expect(res.body.data.suggestions).toHaveLength(0);
    });

    it('should limit product results to 5', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);

      await request(app).get('/api/search/suggestions?q=shoes');

      const productCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(productCall.take).toBe(5);
    });
  });

  // ===== POPULAR SEARCHES =====

  describe('GET /api/search/popular', () => {
    it('should return popular search terms', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Samsung Galaxy S24', slug: 'samsung-galaxy-s24' },
        { id: 'p2', name: 'MacBook Pro M3', slug: 'macbook-pro-m3' },
      ]);

      const res = await request(app).get('/api/search/popular');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.popular).toHaveLength(2);
      expect(res.body.data.popular[0]).toHaveProperty('text');
      expect(res.body.data.popular[0]).toHaveProperty('slug');
    });

    it('should order by featured products first', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      await request(app).get('/api/search/popular');

      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.orderBy[0]).toEqual({ isFeatured: 'desc' });
    });
  });
});
