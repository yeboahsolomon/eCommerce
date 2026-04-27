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
 * ┌────────────────┬──────────────────────────────────────────────────┐
 * │ Feed           │ Scoring / Sort                                  │
 * ├────────────────┼──────────────────────────────────────────────────┤
 * │ Trending       │ views×0.3 + sales×0.4 + recency×0.3 (14 days)  │
 * │ Best Sellers   │ salesCount DESC (all-time)                      │
 * │ Top Deals      │ discount% DESC (≥10% off, in-stock)            │
 * │ New Arrivals   │ createdAt DESC (last 30 days)                   │
 * │ Top Rated      │ averageRating DESC (≥4.0, ≥3 reviews)          │
 * │ Category Picks │ per-category: sales×0.5+views×0.3+recency×0.2  │
 * └────────────────┴──────────────────────────────────────────────────┘
 *
 * All feeds are fetched in parallel and cached for 15 minutes.
 */

const HOMEPAGE_CACHE_KEY = 'homepage:feeds';
const HOMEPAGE_CACHE_TTL = 900; // 15 minutes
const FEED_LIMIT = 12;
const CATEGORY_FEED_LIMIT = 8;
const MAX_CATEGORY_ROWS = 6;

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
  return {
    ...product,
    priceInCedis: product.priceInPesewas / 100,
    comparePriceInCedis: product.comparePriceInPesewas
      ? product.comparePriceInPesewas / 100
      : null,
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
    const [trending, bestSellers, topDeals, newArrivals, topRated, categoryPicks] =
      await Promise.all([
        this.getTrendingProducts(),
        this.getBestSellers(),
        this.getTopDeals(),
        this.getNewArrivals(),
        this.getTopRated(),
        this.getCategoryPicks(),
      ]);

    const feeds = {
      trending,
      bestSellers,
      topDeals,
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
}

export const recommendationService = new RecommendationService();
