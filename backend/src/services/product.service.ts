import prisma from "../config/database.js";
import { ApiError } from "../middleware/error.middleware.js";
import { redisService } from "./redis.service.js";
import { generateSlug } from "../utils/helpers.js";
import { CreateProductInput, UpdateProductInput } from "../utils/validators.js";

const CACHE_TTL = 3600;

export class ProductService {
  async getProducts(query: any) {
    const {
      page = "1",
      limit = "20",
      category,
      search,
      inStock,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      order = "desc",
      featured,
      seller,
    } = query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 50);
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `products:list:${JSON.stringify(query)}`;
    const cachedData = await redisService.get(cacheKey);
    if (cachedData) return cachedData;

    const where: any = { isActive: true };

    if (category) {
      const cat = await prisma.category.findFirst({
        where: {
          OR: [{ id: category as string }, { slug: category as string }],
        },
        include: { children: { select: { id: true } } },
      });
      if (cat) {
        const categoryIds = [cat.id, ...cat.children.map((c) => c.id)];
        where.categoryId = { in: categoryIds };
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { sku: { equals: search as string, mode: "insensitive" } },
      ];
    }

    if (inStock === "true") {
      where.OR = [
        { trackInventory: false },
        { stockQuantity: { gt: 0 } },
        { allowBackorder: true },
      ];
    }

    if (minPrice || maxPrice) {
      where.priceInPesewas = {};
      if (minPrice) where.priceInPesewas.gte = parseInt(minPrice as string, 10);
      if (maxPrice) where.priceInPesewas.lte = parseInt(maxPrice as string, 10);
    }

    if (featured === "true") where.isFeatured = true;

    if (seller) {
      const sellerProfile = await prisma.sellerProfile.findFirst({
        where: { OR: [{ id: seller as string }, { slug: seller as string }] },
        select: { id: true },
      });
      if (sellerProfile) where.sellerId = sellerProfile.id;
      else where.sellerId = "non-existent";
    }

    const orderBy: any = {};
    orderBy[sortBy as string] = order;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 5 },
          variants: true,
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
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    const transformedProducts = products.map((product) => ({
      ...product,
      priceInCedis: product.priceInPesewas / 100,
      comparePriceInCedis: product.comparePriceInPesewas
        ? product.comparePriceInPesewas / 100
        : null,
      inStock:
        !product.trackInventory ||
        product.stockQuantity > 0 ||
        product.allowBackorder,
      image: product.images[0]?.url || null,
    }));

    const result = {
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    };

    await redisService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async getProductById(id: string, user: any) {
    const cacheKey = `products:detail:${id}`;
    let product = await redisService.get<any>(cacheKey);

    if (!product) {
      product = await prisma.product.findFirst({
        where: { OR: [{ id }, { slug: id }, { sku: id }] },
        include: {
          category: true,
          seller: {
            select: {
              id: true,
              businessName: true,
              slug: true,
              logoUrl: true,
              ghanaRegion: true,
              businessAddress: true,
            },
          },
          images: { orderBy: { sortOrder: "asc" } },
          variants: true,
          reviews: {
            where: { isApproved: true },
            include: {
              user: {
                select: { firstName: true, lastName: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (product) await redisService.set(cacheKey, product, CACHE_TTL);
    }

    if (!product) throw new ApiError(404, "Product not found.");

    if (!product.isActive) {
      const isOwner =
        user?.role === "SELLER" && user?.sellerProfile?.id === product.sellerId;
      const isAdmin = user?.role === "ADMIN";
      if (!isOwner && !isAdmin) throw new ApiError(404, "Product not found.");
    }

    prisma.product
      .update({ where: { id: product.id }, data: { views: { increment: 1 } } })
      .catch(console.error);

    return {
      product: {
        ...product,
        priceInCedis: product.priceInPesewas / 100,
        comparePriceInCedis: product.comparePriceInPesewas
          ? product.comparePriceInPesewas / 100
          : null,
        inStock:
          !product.trackInventory ||
          product.stockQuantity > 0 ||
          product.allowBackorder,
        image: product.images[0]?.url || null,
      },
    };
  }

  async getRelatedProducts(id: string) {
    const limit = 5;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: {
        id: true,
        categoryId: true,
        category: { select: { parentId: true } },
      },
    });

    if (!product) throw new ApiError(404, "Product not found");

    const relatedProducts = await prisma.product.findMany({
      where: {
        id: { not: product.id },
        isActive: true,
        OR: [{ categoryId: product.categoryId }],
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { name: true, slug: true } },
      },
      orderBy: { views: "desc" },
      take: limit,
    });

    return relatedProducts.map((p) => ({
      ...p,
      priceInCedis: p.priceInPesewas / 100,
      image: p.images[0]?.url || null,
    }));
  }

  async createProduct(
    data: CreateProductInput & { images?: string[]; variants?: any[] },
    user: any,
  ) {
    const { images, variants, ...productData } = data;

    let sellerId = productData.sellerId;
    if (user?.role === "SELLER") {
      if (!user.sellerProfile)
        throw new ApiError(
          400,
          "Seller profile not found. Please complete your seller profile.",
        );
      sellerId = user.sellerProfile.id;
    }

    let slug = generateSlug(productData.name);
    let suffix = 0;
    while (await prisma.product.findUnique({ where: { slug } })) {
      suffix++;
      slug = `${generateSlug(productData.name)}-${suffix}`;
    }

    if (productData.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: productData.sku },
      });
      if (existingSku)
        throw new ApiError(409, "A product with this SKU already exists.");
    }

    const product = await prisma.product.create({
      data: {
        ...productData,
        slug,
        sellerId,
        images:
          images && images.length > 0
            ? {
                create: images.map((url, index) => ({
                  url,
                  isPrimary: index === 0,
                  sortOrder: index,
                })),
              }
            : undefined,
        hasVariants: variants && variants.length > 0 ? true : false,
        variants:
          variants && variants.length > 0 ? { create: variants } : undefined,
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
      },
    });

    return {
      product: { ...product, priceInCedis: product.priceInPesewas / 100 },
    };
  }

  async updateProductImages(id: string, images: any[], user: any) {
    if (!Array.isArray(images))
      throw new ApiError(400, "Images must be an array");

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) throw new ApiError(404, "Product not found");

    if (user.role !== "ADMIN") {
      if (existingProduct.sellerId !== user.sellerProfile?.id)
        throw new ApiError(403, "Not authorized to update this product");
    }

    await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((img: any, index: number) => ({
            productId: id,
            url: img.url,
            isPrimary: img.isPrimary || index === 0,
            sortOrder: img.sortOrder || index,
          })),
        });
      }
    });

    await redisService.del(`products:detail:${id}`);
    await redisService.del(`products:detail:${existingProduct.slug}`);
    await redisService.clearPattern("products:list:*");

    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    return { images: updatedProduct?.images };
  }

  async updateProduct(
    id: string,
    data: UpdateProductInput & { images?: string[]; variants?: any[] },
    user: any,
  ) {
    const { images, variants, ...updateData } = data;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) throw new ApiError(404, "Product not found.");

    if (user?.role === "SELLER") {
      if (!user.sellerProfile)
        throw new ApiError(403, "Seller profile not found.");
      if (existingProduct.sellerId !== user.sellerProfile.id)
        throw new ApiError(403, "You can only update your own products.");
    }

    if (updateData.name && updateData.name !== existingProduct.name) {
      (updateData as any).slug = generateSlug(updateData.name);
    }

    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findFirst({
        where: { sku: updateData.sku, id: { not: id } },
      });
      if (existingSku)
        throw new ApiError(409, "A product with this SKU already exists.");
    }

    if (
      updateData.stockQuantity !== undefined &&
      updateData.stockQuantity !== existingProduct.stockQuantity
    ) {
      const quantityChange =
        updateData.stockQuantity - existingProduct.stockQuantity;
      const action = quantityChange > 0 ? "RESTOCK" : "ADJUSTMENT";
      await prisma.inventoryLog.create({
        data: {
          productId: id,
          action,
          quantityChange,
          previousQuantity: existingProduct.stockQuantity,
          newQuantity: updateData.stockQuantity,
          userId: user?.id,
          notes: "Manual update via Product Edit",
        },
      });
    }

    if (images !== undefined) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((url, index) => ({
            productId: id,
            url,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        });
      }
    }

    if (variants !== undefined) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      if (variants.length > 0) {
        await prisma.productVariant.createMany({
          data: variants.map((v: any) => ({ productId: id, ...v }) as any),
        });
        (updateData as any).hasVariants = true;
      } else {
        (updateData as any).hasVariants = false;
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
      },
    });

    await redisService.del(`products:detail:${id}`);
    await redisService.del(`products:detail:${product.slug}`);
    await redisService.clearPattern("products:list:*");

    return {
      product: { ...product, priceInCedis: product.priceInPesewas / 100 },
    };
  }

  /**
   * Deal of the Day Algorithm
   *
   * Selects a single product daily using a weighted scoring system inspired
   * by Jumia/Amazon deal algorithms. The same deal is served to all users
   * for 24 hours (midnight-to-midnight UTC), cached in Redis.
   *
   * Scoring: discount(35%) + sales(25%) + rating(20%) + views(10%) + recency(10%)
   */
  async getDealOfTheDay() {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const cacheKey = `deal-of-the-day:${today}`;

    // 1. Check Redis cache first
    const cached = await redisService.get<any>(cacheKey);
    if (cached) return cached;

    // 2. Fetch eligible products (discounted, in-stock, active, with images)
    const candidates = await prisma.product.findMany({
      where: {
        isActive: true,
        comparePriceInPesewas: { not: null },
        stockQuantity: { gte: 5 },
        images: { some: {} },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 3 },
        seller: {
          select: { id: true, businessName: true, slug: true, logoUrl: true },
        },
      },
      take: 100, // Evaluate top 100 candidates max for performance
      orderBy: { salesCount: "desc" },
    });

    if (candidates.length === 0) return null;

    // 3. Get recent deal history to avoid repeats (last 7 days)
    const historyKey = "deal-of-the-day:history";
    const recentDealIds: string[] =
      (await redisService.get<string[]>(historyKey)) || [];

    // 4. Calculate scoring metrics across all candidates for normalization
    const maxSales = Math.max(...candidates.map((p) => p.salesCount), 1);
    const maxViews = Math.max(...candidates.map((p) => p.views), 1);
    const now = Date.now();

    // 5. Score each candidate
    const scored = candidates
      .map((product) => {
        const comparePrice = product.comparePriceInPesewas!;
        const currentPrice = product.priceInPesewas;

        // Discount percentage (must be >= 10% to qualify)
        const discountPct =
          ((comparePrice - currentPrice) / comparePrice) * 100;
        if (discountPct < 10 || currentPrice >= comparePrice) return null;

        // Normalized scores (0-1 range)
        const discountScore = Math.min(discountPct / 70, 1); // Cap at 70% discount
        const salesScore = product.salesCount / maxSales;
        const ratingScore = Number(product.averageRating) / 5;
        const viewsScore = product.views / maxViews;

        // Recency: products created in last 30 days get full score, decays over 180 days
        const ageInDays =
          (now - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 1 - ageInDays / 180);

        // Weighted total
        let totalScore =
          discountScore * 0.35 +
          salesScore * 0.25 +
          ratingScore * 0.2 +
          viewsScore * 0.1 +
          recencyScore * 0.1;

        // Penalty for recent deals (reduce score by 80% if featured in last 7 days)
        if (recentDealIds.includes(product.id)) {
          totalScore *= 0.2;
        }

        // Deterministic daily variation using date seed
        // This prevents the same product from winning every day when scores are close
        const dateSeed = today
          .split("-")
          .reduce((sum, n) => sum + parseInt(n), 0);
        const productSeed =
          product.id.charCodeAt(0) +
          product.id.charCodeAt(product.id.length - 1);
        const variation = ((dateSeed * productSeed) % 100) / 1000; // 0-0.1 range
        totalScore += variation;

        return {
          product,
          totalScore,
          discountPct: Math.round(discountPct),
        };
      })
      .filter(Boolean) as {
      product: any;
      totalScore: number;
      discountPct: number;
    }[];

    if (scored.length === 0) return null;

    // 6. Select the highest scoring product
    scored.sort((a, b) => b.totalScore - a.totalScore);
    const winner = scored[0];
    const product = winner.product;

    // 7. Calculate deal end time (midnight UTC tonight)
    const endOfDay = new Date(today + "T23:59:59.999Z");
    const ttlSeconds = Math.max(
      1,
      Math.floor((endOfDay.getTime() - Date.now()) / 1000),
    );

    // 8. Build the response
    const totalStock = product.stockQuantity + product.salesCount;
    const soldPercentage =
      totalStock > 0 ? Math.round((product.salesCount / totalStock) * 100) : 0;

    const dealData = {
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceInPesewas: product.priceInPesewas,
        priceInCedis: product.priceInPesewas / 100,
        comparePriceInPesewas: product.comparePriceInPesewas,
        comparePriceInCedis: product.comparePriceInPesewas! / 100,
        image: product.images[0]?.url || null,
        images: product.images,
        category: product.category,
        seller: product.seller,
        averageRating: Number(product.averageRating),
        reviewCount: product.reviewCount,
        stockQuantity: product.stockQuantity,
        salesCount: product.salesCount,
      },
      deal: {
        discountPercentage: winner.discountPct,
        savingsInPesewas:
          product.comparePriceInPesewas! - product.priceInPesewas,
        savingsInCedis:
          (product.comparePriceInPesewas! - product.priceInPesewas) / 100,
        endsAt: endOfDay.toISOString(),
        stockAvailable: product.stockQuantity,
        stockSold: product.salesCount,
        soldPercentage,
      },
    };

    // 9. Cache the result until midnight
    await redisService.set(cacheKey, dealData, ttlSeconds);

    // 10. Update deal history (keep last 7 product IDs)
    const updatedHistory = [
      product.id,
      ...recentDealIds.filter((id) => id !== product.id),
    ].slice(0, 7);
    await redisService.set(historyKey, updatedHistory, 7 * 24 * 60 * 60); // 7 days TTL

    return dealData;
  }

  async deleteProduct(id: string, user: any) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new ApiError(404, "Product not found.");

    if (user?.role === "SELLER") {
      if (!user.sellerProfile)
        throw new ApiError(403, "Seller profile not found.");
      if (product.sellerId !== user.sellerProfile.id)
        throw new ApiError(403, "You can only delete your own products.");
    }

    const orderCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderCount > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      await redisService.del(`products:detail:${id}`);
      await redisService.del(`products:detail:${product.slug}`);
      await redisService.clearPattern("products:list:*");
      return {
        success: true,
        message: "Product deactivated (preserved for order history).",
      };
    } else {
      await prisma.product.delete({ where: { id } });
      await redisService.del(`products:detail:${id}`);
      await redisService.del(`products:detail:${product.slug}`);
      await redisService.clearPattern("products:list:*");
      return { success: true, message: "Product deleted successfully!" };
    }
  }
}

export const productService = new ProductService();
