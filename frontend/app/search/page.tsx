"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import ProductCard from "@/components/ui/ProductCard";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import type { SearchResult, Pagination, Category, Product } from "@/types";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
  TrendingUp,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating", label: "Highest Rated" },
];

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [sort, setSort] = useState(searchParams.get("sort") || "relevance");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [inStockOnly, setInStockOnly] = useState(searchParams.get("inStock") === "true");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch search results
  const { data, isLoading } = useQuery({
    queryKey: ["search-results", query, page, sort, selectedCategory, inStockOnly],
    queryFn: () =>
      api.search(query, {
        page,
        limit: 20,
        sortBy: sort === "price_asc" || sort === "price_desc" ? "priceInPesewas" : sort === "rating" ? "averageRating" : sort === "newest" ? "createdAt" : undefined,
        order: sort === "price_desc" ? "desc" : sort === "price_asc" ? "asc" : sort === "rating" ? "desc" : sort === "newest" ? "desc" : undefined,
        category: selectedCategory || undefined,
        inStock: inStockOnly || undefined,
      } as Record<string, unknown>),
    enabled: !!query,
  });

  const results: SearchResult[] = data?.data?.results || [];
  const pagination: Pagination | undefined = data?.data?.pagination;

  // Fetch categories for filter sidebar
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.getCategories();
      return res.success && res.data?.categories ? res.data.categories : [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const categories: Category[] = categoriesData || [];

  // Fetch popular searches for No Results state
  const { data: popularData } = useQuery({
    queryKey: ["search-popular"],
    queryFn: () => api.getPopularSearches(),
    staleTime: 5 * 60 * 1000,
    enabled: !isLoading && results.length === 0 && !!query,
  });
  const popularSearches = popularData?.data?.popular || [];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory) count++;
    if (inStockOnly) count++;
    return count;
  }, [selectedCategory, inStockOnly]);

  const clearFilters = () => {
    setSelectedCategory("");
    setInStockOnly(false);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: "Search", href: "/search" },
            ...(query ? [{ label: `"${query}"` }] : []),
          ]}
          className="mb-4"
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {query ? "Search Results" : "Search"}
            </h1>
            {query && pagination && (
              <p className="text-gray-500 text-sm mt-0.5">
                {pagination.total} {pagination.total === 1 ? "result" : "results"} for{" "}
                <span className="font-semibold text-gray-700">&quot;{query}&quot;</span>
              </p>
            )}
          </div>

          {/* Sort & Filter controls */}
          {query && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <SlidersHorizontal className="h-4 w-4 text-gray-400 hidden sm:block" />
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {query ? (
          <div className="flex gap-6">
            {/* Filter Sidebar */}
            <aside
              className={`${
                showFilters ? "block" : "hidden"
              } lg:block w-full lg:w-56 shrink-0 space-y-4 ${showFilters ? "mb-4 lg:mb-0" : ""}`}
            >
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-5 sticky top-20">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Category
                  </h4>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    <li>
                      <button
                        onClick={() => {
                          setSelectedCategory("");
                          setPage(1);
                        }}
                        className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                          !selectedCategory
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        All Categories
                      </button>
                    </li>
                    {categories.map((cat) => (
                      <li key={cat.id}>
                        <button
                          onClick={() => {
                            setSelectedCategory(cat.slug);
                            setPage(1);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                            selectedCategory === cat.slug
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {cat.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* In Stock Toggle */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Availability
                  </h4>
                  <label className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => {
                        setInStockOnly(e.target.checked);
                        setPage(1);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">In Stock Only</span>
                  </label>
                </div>

                {/* Clear filters on mobile */}
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </aside>

            {/* Results */}
            <div className="flex-1 min-w-0">
              {/* Active filters chips */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
                      <button onClick={() => { setSelectedCategory(""); setPage(1); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {inStockOnly && (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      In Stock
                      <button onClick={() => { setInStockOnly(false); setPage(1); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : results.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {results.map((result) => (
                      <ProductCard 
                        key={result.id} 
                        product={{
                          ...result,
                          priceInPesewas: result.priceInCedis * 100,
                          comparePriceInPesewas: result.comparePriceInCedis ? result.comparePriceInCedis * 100 : undefined,
                        } as unknown as Product} 
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.pages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                        const half = 2;
                        let start = Math.max(1, page - half);
                        const end = Math.min(pagination.pages, start + 4);
                        start = Math.max(1, end - 4);
                        const pageNum = start + i;
                        if (pageNum > pagination.pages) return null;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors ${
                              page === pageNum
                                ? "bg-blue-600 text-white"
                                : "border border-gray-200 hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                        disabled={page === pagination.pages}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* No Results State */
                <div className="text-center py-16 space-y-5">
                  <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <SearchIcon className="h-8 w-8 text-gray-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">No results found</h2>
                    <p className="text-gray-500 max-w-md mx-auto text-sm">
                      We couldn&apos;t find any products matching &quot;{query}&quot;.
                      {activeFilterCount > 0
                        ? " Try removing some filters or "
                        : " Try checking for typos or "}
                      using different keywords.
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="mt-3 text-sm text-blue-600 hover:underline font-medium"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>

                  {/* Popular searches as suggestions */}
                  {popularSearches.length > 0 && (
                    <div className="pt-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5 mb-3">
                        <TrendingUp className="h-3 w-3" /> Popular Searches
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {popularSearches.map((item: { text: string; slug: string }, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => {
                              router.push(`/search?q=${encodeURIComponent(item.text)}`);
                            }}
                            className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                          >
                            {item.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty query state */
          <div className="text-center py-20 space-y-4">
            <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Package className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              What are you looking for?
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Use the search bar above to find products, brands, and categories.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
