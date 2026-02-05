import { Request, Response, NextFunction } from 'express';

// ==================== IN-MEMORY CACHE ====================
// Simple caching solution - no external dependencies required

interface CacheEntry {
  data: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

// Cache utilities
export const cacheService = {
  get: (key: string): any | null => {
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  },

  set: (key: string, data: any, ttlMs: number = DEFAULT_TTL): void => {
    cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  },

  delete: (key: string): void => {
    cache.delete(key);
  },

  // Delete all keys matching a pattern (prefix)
  invalidatePattern: (prefix: string): void => {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  },

  // Clear entire cache
  clear: (): void => {
    cache.clear();
  },

  // Get cache stats
  stats: () => ({
    size: cache.size,
    keys: Array.from(cache.keys()),
  }),
};

// ==================== CACHE MIDDLEWARE ====================

interface CacheOptions {
  ttlMs?: number;
  keyGenerator?: (req: Request) => string;
}

// Create cache middleware for GET requests
export const cacheMiddleware = (prefix: string, options: CacheOptions = {}) => {
  const { ttlMs = DEFAULT_TTL, keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = keyGenerator
      ? keyGenerator(req)
      : `${prefix}:${req.originalUrl}`;

    const cached = cacheService.get(key);
    
    if (cached) {
      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(key, body, ttlMs);
      }
      return originalJson(body);
    };

    next();
  };
};

// Pre-defined cache configurations
export const cacheProducts = cacheMiddleware('products', { ttlMs: 2 * 60 * 1000 }); // 2 min
export const cacheCategories = cacheMiddleware('categories', { ttlMs: 10 * 60 * 1000 }); // 10 min
export const cacheSearch = cacheMiddleware('search', { ttlMs: 1 * 60 * 1000 }); // 1 min

// Invalidation helpers
export const invalidateProductCache = () => cacheService.invalidatePattern('products');
export const invalidateCategoryCache = () => cacheService.invalidatePattern('categories');
export const invalidateSearchCache = () => cacheService.invalidatePattern('search');
