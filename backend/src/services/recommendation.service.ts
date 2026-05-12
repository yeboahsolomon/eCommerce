import prisma from '../config/database.js';
import { redisService } from './redis.service.js';

/**
 * ═══════════════════════════════════════════════════════════════════
 * RECOMMENDATION SERVICE — Homepage Product Feed Engine
 * ═══════════════════════════════════════════════════════════════════
 *
 * Computes multiple algorithmically-ranked product feeds for the
 * homepage, inspired by Jumia and Amazon's product discovery systems.
 *
 * Algorithm overview:
 * ┌────────────────┬──────────────────────────────────────────────────────┐
 * │ Feed           │ Scoring / Sort                                      │
 * ├────────────────┼──────────────────────────────────────────────────────┤
 * │ Trending       │ views×0.3 + sales×0.4 + recency×0.3 (14 days)      │
 * │ Best Sellers   │ salesCount DESC (all-time)                          │
 * │ Top Deals      │ discount% DESC (≥10% off, in-stock)                │
 * │ Flash Sales    │ discount×0.35 + velocity×0.25 + recency×0.15       │
 * │                │   + scarcity×0.15 + rating×0.10 (≥10% off)         │
 * │ New Arrivals   │ createdAt DESC (last 30 days)                      │
 * │ Top Rated      │ averageRating DESC (≥4.0, ≥3 reviews)              │
 * │ Category Picks │ per-category: sales×0.5+views×0.3+recency×0.2     │
 * └────────────────┴──────────────────────────────────────────────────────┘
 *
 * All feeds are fetched in parallel and cached for 15 minutes.
 * Flash Sales have a separate 10-minute cache and support pagination.
 */

const HOMEPAGE_CACHE_KEY = 'homepage:feeds';
const HOMEPAGE_CACHE_TTL = 900; // 15 minutes
const FEED_LIMIT = 12;
const CATEGORY_FEED_LIMIT = 8;
const MAX_CATEGORY_ROWS = 6;

// Flash Sales specific constants
const FLASH_SALES_CACHE_PREFIX = 'flash-sales';
const FLASH_SALES_CACHE_TTL = 600; // 10 minutes
const FLASH_SALES_TOP_PICKS_LIMIT = 6;
const FLASH_SALES_DEFAULT_LIMIT = 20;
const FLASH_SALES_HOMEPAGE_LIMIT = 12;
const FLASH_SALES_MIN_DISCOUNT = 10; // Minimum discount % to qualify

/** Shared Prisma include for all product queries */
const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const }, take: 3 },
  seller: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      ghanaRegion: true,
      businessAddress: true,
      logoUrl: true,
    },
  },
} as const;

/** Transform a raw Prisma product into the API response shape */
function transformProduct(product: any) {
  let discountPercentage = null;
  if (product.comparePriceInPesewas && product.priceInPesewas < product.comparePriceInPesewas) {
    discountPercentage = Math.round(((product.comparePriceInPesewas - product.priceInPesewas) / product.comparePriceInPesewas) * 100);
  }

  return {
    ...product,
    priceInCedis: product.priceInPesewas / 100,
    comparePriceInCedis: product.comparePriceInPesewas
      ? product.comparePriceInPesewas / 100
      : null,
    discountPercentage,
    inStock:
      !product.trackInventory ||
      product.stockQuantity > 0 ||
      product.allowBackorder,
    image: product.images?.[0]?.url || null,
  };
}

/** Normalize a value into 0-1 range given a max */
function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(value / max, 1);
}

/** Compute a recency score (1.0 = today, 0.0 = beyond windowDays) */
function recencyScore(createdAt: Date, windowDays: number): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / windowDays);
}

export class RecommendationService {
  /**
   * Get all homepage product feeds in a single call.
   * This is the primary method consumed by the frontend.
   */
  async getHomepageFeeds() {
    // 1. Check Redis cache
    const cached = await redisService.get<any>(HOMEPAGE_CACHE_KEY);
    if (cached) return cached;

    // 2. Compute all feeds in parallel
    const [trending, bestSellers, topDeals, flashSales, newArrivals, topRated, categoryPicks] =
      await Promise.all([
        this.getTrendingProducts(),
        this.getBestSellers(),
        this.getTopDeals(),
        this.getFlashSalesForHomepage(),
        this.getNewArrivals(),
        this.getTopRated(),
        this.getCategoryPicks(),
      ]);

    const feeds = {
      trending,
      bestSellers,
      topDeals,
      flashSales,
      newArrivals,
      topRated,
      categoryPicks,
    };

    // 3. Cache the result
    await redisService.set(HOMEPAGE_CACHE_KEY, feeds, HOMEPAGE_CACHE_TTL);

    return feeds;
  }

  // ═══════════════════════════════════════════════════════════════
  // FEED: Trending Now
  // Products with the highest engagement velocity in the last 14 days
  // Score = views×0.3 + salesCount×0.4 + recency×0.3
  // ═══════════════════════════════════════════════════════════════

  private async getTrendingProducts() {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const candidates = await prisma.product.findMany({
      where: {
        isActive: true,
        images: { some: {} },
        // Broaden: include products updated or created in last 14 days,
        // plus any with decent sales/views regardless of age
        OR: [
          { createdAt: { gte: fourteenDaysAgo } },
          { salesCount: { gte: 1 } },
          { views: { gte: 5 } },
        ],
      },
      include: PRODUCT_INCLUDE,
      take: 60, // Fetch more than needed for scoring
      orderBy: { views: 'desc' },
    });

    if (candidates.length === 0) return [];

    const maxViews = Math.max(...candidates.map((p) => p.views), 1);
    const maxSales = Math.max(...candidates.map((p) => p.salesCount), 1);

    const scored = candidates.map((product) => {
      const score =
        normalize(product.views, maxViews) * 0.3 +
        normalize(product.salesCount, maxSales) * 0.4 +
        recencyScore(product.createdAt, 14) * 0.3;

      return { product, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, FEED_LIMIT).map((s) => transformProduct(s.product));
  }

  // ═══════════════════════════════════════════════════════════════
  // FEED: Best Sellers
  // All-time top products by sales volume
  // ═══════════════════════════════════════════════════════════════

  private async getBestSellers() {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        salesCount: { gte: 1 },
        images: { some: {} },
      },
      include: PRODUCT_INCLUDE,
      orderBy: { salesCount: 'desc' },
      take: FEED_LIMIT,
    });

    return products.map(transformProduct);
  }

  // ═══════════════════════════════════════════════════════════════
  // FEED: Top Deals
  // Products with the highest discount percentages (≥10%)
  // ═══════════════════════════════════════════════════════════════

  private async getTopDeals() {
    const candidates = await prisma.product.findMany({
      where: {
        isActive: true,
        comparePriceInPesewas: { not: null },
        images: { some: {} },
        // Ensure in-stock
        OR: [
          { trackInventory: false },
          { stockQuantity: { gt: 0 } },
          { allowBackorder: true },
        ],
      },
      include: PRODUCT_INCLUDE,
      take: 50,
      orderBy: { comparePriceInPesewas: 'desc' },
    });

    // Calculate and filter by discount percentage
    const withDiscount = candidates
      .map((product) => {
        const comparePrice = product.comparePriceInPesewas!;
        const currentPrice = product.priceInPesewas;
        if (currentPrice >= comparePrice) return null;

        const discountPct =
          ((comparePrice - currentPrice) / comparePrice) * 100;
        if (discountPct < 10) return null;

        return { product, discountPct };
      })
      .filter(Boolean) as { product: any; discountPct: number }[];

    // Sort by discount percentage descending
    withDiscount.sort((a, b) => b.discountPct - a.discountPct);

    return withDiscount
      .slice(0, FEED_LIMIT)
      .map((d) => transformProduct(d.product));
  }

  // ═══════════════════════════════════════════════════════════════
  // FEED: New Arrivals
  // Products created in the last 30 days, most recent first
  // ═══════════════════════════════════════════════════════════════

  private async getNewArrivals() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        createdAt: { gte: thirtyDaysAgo },
        images: { some: {} },
      },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: FEED_LIMIT,
    });

    return products.map(transformProduct);
  }

  // ═══════════════════════════════════════════════════════════════
  // FEED: Top Rated
  // Highly rated products with enough reviews for credibility
  // ═══════════════════════════════════════════════════════════════

  private async getTopRated() {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        averageRating: { gte: 4.0 },
        reviewCount: { gte: 3 },
        images: { some: {} },
      },
      include: PRODUCT_INCLUDE,
      orderBy: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
      take: FEED_LIMIT,
    });

    return products.map(transformProduct);
  }

  // ═══════════════════════════════════════════════════════════════
  // FEED: Category Picks
  // Top products from each of the top 6 categories (by product count)
  // Score = salesCount×0.5 + views×0.3 + recency×0.2
  // ═══════════════════════════════════════════════════════════════

  private async getCategoryPicks() {
    // 1. Get the top categories by product count
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null, // Root categories only
        products: { some: { isActive: true, images: { some: {} } } },
      },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Sort by product count and take top N
    const topCategories = categories
      .sort((a, b) => b._count.products - a._count.products)
      .slice(0, MAX_CATEGORY_ROWS);

    if (topCategories.length === 0) return [];

    // 2. For each category, get top products with scoring
    const categoryPicks = await Promise.all(
      topCategories.map(async (category) => {
        // Include child category IDs for subcategory coverage
        const children = await prisma.category.findMany({
          where: { parentId: category.id, isActive: true },
          select: { id: true },
        });
        const categoryIds = [category.id, ...children.map((c) => c.id)];

        const candidates = await prisma.product.findMany({
          where: {
            isActive: true,
            categoryId: { in: categoryIds },
            images: { some: {} },
          },
          include: PRODUCT_INCLUDE,
          take: 30, // Fetch more than needed for scoring
          orderBy: { salesCount: 'desc' },
        });

        if (candidates.length === 0) return null;

        const maxSales = Math.max(...candidates.map((p) => p.salesCount), 1);
        const maxViews = Math.max(...candidates.map((p) => p.views), 1);

        const scored = candidates.map((product) => {
          const score =
            normalize(product.salesCount, maxSales) * 0.5 +
            normalize(product.views, maxViews) * 0.3 +
            recencyScore(product.createdAt, 90) * 0.2;

          return { product, score };
        });

        scored.sort((a, b) => b.score - a.score);

        return {
          category: {
            id: category.id,
            name: category.name,
            slug: category.slug,
          },
          products: scored
            .slice(0, CATEGORY_FEED_LIMIT)
            .map((s) => transformProduct(s.product)),
        };
      })
    );

    return categoryPicks.filter(Boolean);
  }

  // ═══════════════════════════════════════════════════════════════
  // FLASH SALES — Composite Scoring Algorithm
  // Score = discount×0.35 + velocity×0.25 + recency×0.15
  //       + scarcity×0.15 + rating×0.10
  //
  // Qualification: ≥10% discount, in-stock, active, has images
  // ═══════════════════════════════════════════════════════════════

  /**
   * Core flash sales candidate fetcher and scorer.
   * Returns ALL scored candidates (used by both homepage preview and paginated page).
   */
  private async getFlashSalesCandidatesScored(): Promise<{ product: any; score: number; discountPct: number }[]> {
    const cacheKey = `${FLASH_SALES_CACHE_PREFIX}:scored`;
    const cached = await redisService.get<any[]>(cacheKey);
    if (cached) return cached;

    const candidates = await prisma.product.findMany({
      where: {
        isActive: true,
        comparePriceInPesewas: { not: null },
        images: { some: {} },
        OR: [
          { trackInventory: false },
          { stockQuantity: { gt: 0 } },
          { allowBackorder: true },
        ],
      },
      include: PRODUCT_INCLUDE,
      take: 150, // Large candidate pool for quality scoring
      orderBy: [{ salesCount: 'desc' }, { views: 'desc' }],
    });

    // Filter to items with real discounts ≥ minimum threshold
    const qualified = candidates
      .map((product) => {
        const comparePrice = product.comparePriceInPesewas!;
        const currentPrice = product.priceInPesewas;
        if (currentPrice >= comparePrice) return null;

        const discountPct = ((comparePrice - currentPrice) / comparePrice) * 100;
        if (discountPct < FLASH_SALES_MIN_DISCOUNT) return null;

        return { product, discountPct };
      })
      .filter(Boolean) as { product: any; discountPct: number }[];

    if (qualified.length === 0) {
      await redisService.set(cacheKey, [], FLASH_SALES_CACHE_TTL);
      return [];
    }

    // Compute normalization maxima
    const maxDiscount = Math.max(...qualified.map((q) => q.discountPct), 1);
    const maxSales = Math.max(...qualified.map((q) => q.product.salesCount), 1);
    const maxStock = Math.max(...qualified.map((q) => q.product.stockQuantity ?? 0), 1);
    const maxRating = 5.0;

    // Score each candidate
    const scored = qualified.map(({ product, discountPct }) => {
      const discountScore = normalize(discountPct, maxDiscount);
      const velocityScore = normalize(product.salesCount, maxSales);
      const recency = recencyScore(product.createdAt, 60); // 60-day window

      // Scarcity: lower stock = higher score (inverted)
      const stock = product.stockQuantity ?? maxStock;
      const scarcityScore = stock <= 0 ? 0 : 1 - normalize(stock, maxStock);

      const ratingScore = normalize(product.averageRating || 0, maxRating);

      const score =
        discountScore * 0.35 +
        velocityScore * 0.25 +
        recency * 0.15 +
        scarcityScore * 0.15 +
        ratingScore * 0.10;

      return { product, score, discountPct };
    });

    scored.sort((a, b) => b.score - a.score);

    await redisService.set(cacheKey, scored, FLASH_SALES_CACHE_TTL);
    return scored;
  }

  /**
   * Flash sales preview for the homepage banner (top N items).
   */
  private async getFlashSalesForHomepage() {
    const scored = await this.getFlashSalesCandidatesScored();
    return scored
      .slice(0, FLASH_SALES_HOMEPAGE_LIMIT)
      .map((s) => transformProduct(s.product));
  }

  /**
   * Paginated flash sales for the dedicated /flash-sales page.
   * Returns products, topPicks, and pagination metadata.
   */
  async getFlashSales(page: number = 1, limit: number = FLASH_SALES_DEFAULT_LIMIT) {
    const scored = await this.getFlashSalesCandidatesScored();
    const total = scored.length;
    const pages = Math.ceil(total / limit);
    const safePage = Math.max(1, Math.min(page, pages || 1));
    const offset = (safePage - 1) * limit;

    const products = scored
      .slice(offset, offset + limit)
      .map((s) => transformProduct(s.product));

    // Top picks = absolute top-scored items (always from the full set)
    const topPicks = scored
      .slice(0, FLASH_SALES_TOP_PICKS_LIMIT)
      .map((s) => transformProduct(s.product));

    return {
      products,
      topPicks,
      pagination: {
        page: safePage,
        limit,
        total,
        pages,
      },
    };
  }
}

export const recommendationService = new RecommendationService();
