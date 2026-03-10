'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/types';
import {
  MapPin, Star, Package, ArrowLeft, Search, SlidersHorizontal,
  ShoppingCart, Heart, Store, ChevronLeft, ChevronRight, BadgeCheck
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/shared/Breadcrumbs';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Highest Rated' },
];

export default function ShopClient() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem } = useCart();

  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  // Fetch seller profile
  const { data: sellerData, isLoading: sellerLoading } = useQuery({
    queryKey: ['seller-profile', slug],
    queryFn: () => api.getSellerBySlug(slug),
    enabled: !!slug,
  });

  // Fetch seller products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products', slug, page, sort, search],
    queryFn: () => api.getSellerShopProducts(slug, { page, limit: 20, sort, search: search || undefined }),
    enabled: !!slug,
  });

  // Fetch seller reviews
  const { data: reviewsData } = useQuery({
    queryKey: ['seller-reviews', slug],
    queryFn: () => api.request<{ reviews: any[], summary: any }>('GET', `/reviews/seller/${slug}`),
    enabled: !!slug,
  });

  const profile = sellerData?.data?.profile;
  const products = productsData?.data?.products || [];
  const pagination = productsData?.data?.pagination;
  const reviews = reviewsData?.data?.reviews || [];
  const reviewsSummary = reviewsData?.data?.summary;

  if (sellerLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Store className="h-16 w-16 text-gray-300 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Shop Not Found</h1>
          <p className="text-gray-500">This seller doesn't exist or has been deactivated.</p>
          <Link href="/products" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Browse all products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Seller Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
          <div className="mb-6 -mx-2">
            <Breadcrumbs items={[
              { label: 'Sellers', href: '/sellers' },
              { label: profile.businessName || 'Shop' }
            ]} className="text-slate-300 [&_a]:text-slate-300 hover:[&_a]:text-white [&_span.text-gray-900]:text-white [&_svg.text-gray-300]:text-slate-500" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Store Avatar */}
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl md:text-4xl font-bold shadow-xl shadow-blue-500/20 shrink-0">
              {profile.businessName?.charAt(0) || 'S'}
            </div>

            {/* Store Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{profile.businessName}</h1>
                {profile.isVerified && (
                  <span className="bg-green-500/20 text-green-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-500/30">
                    ✓ Verified
                  </span>
                )}
              </div>

              {profile.description && (
                <p className="text-slate-300 text-sm max-w-xl leading-relaxed">{profile.description}</p>
              )}

              <div className="flex items-center gap-5 text-sm text-slate-400 flex-wrap">
                {profile.ghanaRegion && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-yellow-400" />
                    {profile.ghanaRegion}
                  </span>
                )}
                {profile.averageRating > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    {profile.averageRating.toFixed(1)} ({profile.totalReviews || 0} reviews)
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-blue-400" />
                  {pagination?.total || products.length} products
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search within store */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search this store..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Package className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
            <p className="text-gray-500 text-sm">
              {search ? `No results for "${search}". Try a different search term.` : 'This store has no products yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {products.map((product: Product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all group border border-gray-100 flex flex-col h-full"
                >
                  <Link href={`/product/${product.slug}`} className="block relative">
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="h-12 w-12" />
                        </div>
                      )}
                      {!product.inStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Out of Stock</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-3 lg:p-4 flex flex-col flex-1">
                    <Link href={`/product/${product.slug}`} className="mb-2">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    {product.category && (
                      <p className="text-xs text-gray-400 mb-2">{product.category.name}</p>
                    )}

                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <p className="text-lg font-bold text-gray-900">
                        GH₵{(product.priceInPesewas / 100).toFixed(2)}
                      </p>

                      {product.inStock && (
                        <button
                          onClick={() => {
                            addItem(product.id, 1, product);
                            toast.success("Added to cart");
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                          title="Add to cart"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {product.averageRating > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span>{product.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
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
                  const pageNum = Math.max(1, Math.min(page - 2 + i, pagination.pages));
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
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
        )}

        {/* ===== SELLER REVIEWS ===== */}
        <div className="mt-16 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-lg">Seller Reviews</h3>
            {reviewsSummary && reviewsSummary.totalReviews > 0 && (
              <span className="text-sm text-slate-500">{reviewsSummary.totalReviews} review{reviewsSummary.totalReviews !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="p-6 lg:p-8">
            {reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((review: any) => (
                  <div key={review.id} className="flex gap-4 border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg">
                      {review.user?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{review.user?.name || "Anonymous User"}</span>
                          <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                            <BadgeCheck className="h-3 w-3 mr-1" />
                            Verified Purchase
                          </span>
                        </div>
                        <span className="text-sm text-slate-400 mt-1 sm:mt-0">
                          {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      {review.comment && <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200">
                <Star className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-slate-900 mb-2">No reviews yet</h4>
                <p className="text-slate-500 text-sm">Customers haven't reviewed this seller yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
