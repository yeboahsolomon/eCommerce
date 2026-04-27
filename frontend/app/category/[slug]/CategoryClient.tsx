"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Product, Category, Pagination } from "@/types";
import ProductCard from "@/components/ui/ProductCard";
import VirtualProductGrid from "@/components/ui/VirtualProductGrid";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Package,
  Frown,
  Home,
  LucideIcon,
  Smartphone,
  Shirt,
  UtensilsCrossed,
  Monitor,
  Sparkles,
  ShoppingBag,
  Dumbbell,
  Baby,
  BookOpen,
  Car,
  Wrench,
} from "lucide-react";

// ────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────

/** Number of products per page — matches backend max of 20 */
const PAGE_SIZE = 20;

/** Sort options shown to the user */
const SORT_OPTIONS: { label: string; sortBy: string; order: string }[] = [
  { label: "Newest First", sortBy: "createdAt", order: "desc" },
  { label: "Price: Low to High", sortBy: "priceInPesewas", order: "asc" },
  { label: "Price: High to Low", sortBy: "priceInPesewas", order: "desc" },
  { label: "Top Rated", sortBy: "averageRating", order: "desc" },
  { label: "Best Selling", sortBy: "salesCount", order: "desc" },
  { label: "Name: A–Z", sortBy: "name", order: "asc" },
];

/** Category icons for the header badge */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Monitor,
  fashion: Shirt,
  "food-groceries": UtensilsCrossed,
  "home-kitchen": Home,
  beauty: Sparkles,
  "phones-tablets": Smartphone,
  sports: Dumbbell,
  "baby-kids": Baby,
  books: BookOpen,
  automotive: Car,
  "tools-hardware": Wrench,
};

/** Category gradient color themes */
const CATEGORY_COLORS: Record<string, string> = {
  electronics: "from-blue-500 to-blue-600",
  fashion: "from-violet-500 to-purple-600",
  "food-groceries": "from-amber-500 to-orange-600",
  "home-kitchen": "from-emerald-500 to-green-600",
  beauty: "from-pink-500 to-rose-600",
  "phones-tablets": "from-cyan-500 to-teal-600",
  sports: "from-indigo-500 to-blue-600",
  "baby-kids": "from-rose-500 to-pink-600",
  books: "from-teal-500 to-emerald-600",
  automotive: "from-slate-500 to-slate-700",
  "tools-hardware": "from-orange-500 to-red-600",
};

// ────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────

export default function CategoryClient() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  // ── Sort & pagination state ──
  const [sortIndex, setSortIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const currentSort = SORT_OPTIONS[sortIndex];

  // ── Fetch category data using React Query ──
  const { data, isLoading, isError } = useQuery({
    queryKey: ["category", slug, currentSort.sortBy, currentSort.order, page],
    queryFn: async () => {
      const res = await api.getCategoryProducts(slug, {
        page,
        limit: PAGE_SIZE,
        sortBy: currentSort.sortBy as any,
        order: currentSort.order as "asc" | "desc",
      });
      if (res.success && res.data) return res.data;
      throw new Error(res.message || "Failed to load category");
    },
    staleTime: 2 * 60 * 1000, // 2 min
  });

  const category = data?.category;
  const products = data?.products || [];
  const pagination = data?.pagination;
  const subcategories = (category as any)?.children || [];

  // ── Resolve visual elements ──
  const Icon = CATEGORY_ICONS[slug] || ShoppingBag;
  const gradient = CATEGORY_COLORS[slug] || "from-blue-500 to-indigo-600";

  // ── Handlers ──
  const handleSortChange = useCallback(
    (index: number) => {
      setSortIndex(index);
      setPage(1); // Reset to first page on sort change
      setShowSortDropdown(false);
    },
    []
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Breadcrumbs ──
  const breadcrumbItems = useMemo(() => {
    const items = [];
    items.push({ label: category?.name || slug });
    return items;
  }, [category, slug]);

  // ── Error state ──
  if (isError) {
    return (
      <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Frown className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Category Not Found
          </h1>
          <p className="text-slate-500 mb-6">
            The category you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-24 md:pb-12">
      {/* ── Breadcrumb ── */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CATEGORY HEADER                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="flex items-start gap-4">
          {/* Category Icon */}
          <div
            className={`hidden sm:flex h-14 w-14 rounded-2xl bg-gradient-to-br ${gradient} items-center justify-center shadow-lg flex-shrink-0`}
          >
            <Icon className="h-7 w-7 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {category?.name}
                </h1>
                {category?.description && (
                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                    {category.description}
                  </p>
                )}
                <p className="text-slate-400 text-sm mt-1">
                  {pagination?.total ?? 0}{" "}
                  {(pagination?.total ?? 0) === 1 ? "product" : "products"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SUBCATEGORY CHIPS                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {subcategories.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1 carousel-scrollbar">
            {/* "All" chip — represents the current parent category */}
            <span
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-slate-900 text-white shadow-sm cursor-default"
            >
              All {category?.name}
            </span>
            {subcategories.map(
              (sub: { id: string; name: string; slug: string; productCount?: number }) => (
                <Link
                  key={sub.id}
                  href={`/category/${sub.slug}`}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm transition-all"
                >
                  {sub.name}
                  {sub.productCount !== undefined && sub.productCount > 0 && (
                    <span className="ml-1.5 text-xs text-slate-400">
                      ({sub.productCount})
                    </span>
                  )}
                </Link>
              )
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SORT BAR                                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Package className="h-4 w-4" />
            <span>
              {isLoading ? (
                <span className="inline-block h-4 w-16 bg-slate-100 rounded animate-pulse" />
              ) : (
                <>
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {products.length > 0
                      ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                          page * PAGE_SIZE,
                          pagination?.total ?? 0
                        )}`
                      : "0"}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {pagination?.total ?? 0}
                  </span>
                </>
              )}
            </span>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 transition-colors"
              id="category-sort-button"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{currentSort.label}</span>
              <span className="sm:hidden">Sort</span>
            </button>

            {showSortDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowSortDropdown(false)}
                />
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1 z-40 w-52 bg-white rounded-xl border border-slate-100 shadow-xl py-1 animate-dropdown-in">
                  {SORT_OPTIONS.map((option, index) => (
                    <button
                      key={option.label}
                      onClick={() => handleSortChange(index)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        index === sortIndex
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PRODUCT GRID                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <VirtualProductGrid products={products} />
        ) : (
          /* Empty state */
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              No Products Found
            </h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              There are currently no products in{" "}
              <span className="font-medium text-slate-700">
                {category?.name}
              </span>
              . Check back later as sellers add new items!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              <Home className="h-4 w-4" />
              Browse All Products
            </Link>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PAGINATION                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {pagination && pagination.pages > 1 && (
          <nav
            className="flex items-center justify-center gap-2 mt-10 mb-4"
            aria-label="Pagination"
          >
            {/* Previous */}
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {generatePageNumbers(page, pagination.pages).map(
                (pageNum, idx) =>
                  pageNum === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="w-10 h-10 flex items-center justify-center text-slate-400 text-sm"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum as number)}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                        pageNum === page
                          ? "bg-slate-900 text-white shadow-md"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
              )}
            </div>

            {/* Next */}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pagination.pages}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// HELPER: Generate smart page number array with ellipsis
// ────────────────────────────────────────────────────────

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}
