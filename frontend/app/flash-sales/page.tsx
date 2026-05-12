"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Product, FlashSalesPageData } from "@/types";
import ProductCard from "@/components/ui/ProductCard";
import CountdownTimer from "@/components/ui/CountdownTimer";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import {
  Zap,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Flame,
  TrendingUp,
  ShoppingBag,
} from "lucide-react";

export default function FlashSalesPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ["flash-sales", page],
    queryFn: async () => {
      const res = await api.getFlashSales(page, limit);
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.products || [];
  const topPicks = data?.topPicks || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  };

  // ── Top Picks Carousel scroll helpers ──
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
    };
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.isDown) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5;
    el.scrollLeft = dragState.current.scrollLeft - walk;
    if (Math.abs(walk) > 5) setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    dragState.current.isDown = false;
    setTimeout(() => setIsDragging(false), 50);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumbs />
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FLASH SALES HERO HEADER                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#D91E1E] via-[#E02B2B] to-[#B91C1C] p-6 sm:p-8 shadow-xl shadow-red-500/10">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Zap className="h-7 w-7 text-yellow-400 fill-yellow-400" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Flash Sales
                  </h1>
                  <p className="text-white/70 text-sm mt-0.5">
                    Limited time deals — grab them before they&apos;re gone!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className="text-white/80 text-sm font-medium">
                Ends in:
              </span>
              <CountdownTimer hoursFromNow={8} variant="dark" />
            </div>
          </div>

          {/* Stats bar */}
          <div className="relative z-10 mt-6 flex flex-wrap gap-4 sm:gap-8">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <Flame className="h-4 w-4 text-yellow-400" />
              <span className="text-white text-sm font-medium">
                {pagination.total} Deals Available
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-white text-sm font-medium">
                Up to 70% Off
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <ShoppingBag className="h-4 w-4 text-blue-300" />
              <span className="text-white text-sm font-medium">
                Free Shipping Available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TOP PICKS CAROUSEL                                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      {topPicks.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="hidden sm:flex h-10 w-10 rounded-xl bg-amber-50 items-center justify-center flex-shrink-0">
              <Flame className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Top Deals For You
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Best flash sale picks — highest value deals right now
              </p>
              <div className="h-0.5 w-12 mt-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 opacity-60" />
            </div>
          </div>

          <div className="relative group/picks">
            {/* Left arrow */}
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/60 border border-slate-100 text-slate-600 hover:text-slate-900 hover:shadow-xl transition-all duration-200 -translate-x-1/2 opacity-0 group-hover/picks:opacity-100 group-hover/picks:translate-x-0 hover:scale-110"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Right arrow */}
            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/60 border border-slate-100 text-slate-600 hover:text-slate-900 hover:shadow-xl transition-all duration-200 translate-x-1/2 opacity-0 group-hover/picks:opacity-100 group-hover/picks:translate-x-0 hover:scale-110"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {/* Left gradient fade */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
            )}

            {/* Right gradient fade */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />
            )}

            <div
              ref={scrollRef}
              className={`flex gap-4 overflow-x-auto pb-2 scroll-smooth ${
                isDragging ? "cursor-grabbing select-none" : "cursor-grab"
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onScroll={checkScroll}
              style={{ scrollbarWidth: "none" }}
            >
              {topPicks.map((product, index) => (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-[160px] sm:w-[200px] lg:w-[220px] animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 0.04}s`,
                    animationFillMode: "backwards",
                    pointerEvents: isDragging ? "none" : "auto",
                  }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ALL FLASH SALES GRID                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex h-10 w-10 rounded-xl bg-rose-50 items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                All Flash Deals
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {pagination.total} deals found
              </p>
              <div className="h-0.5 w-12 mt-2 rounded-full bg-gradient-to-r from-rose-500 to-red-500 opacity-60" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 0.03}s`,
                    animationFillMode: "backwards",
                  }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1 sm:gap-1.5">
                  {Array.from(
                    { length: Math.min(pagination.pages, typeof window !== "undefined" && window.innerWidth < 640 ? 5 : 7) },
                    (_, i) => {
                      const maxVisible = typeof window !== "undefined" && window.innerWidth < 640 ? 5 : 7;
                      const half = Math.floor(maxVisible / 2);
                      let pageNum: number;
                      if (pagination.pages <= maxVisible) {
                        pageNum = i + 1;
                      } else if (page <= half + 1) {
                        pageNum = i + 1;
                      } else if (page >= pagination.pages - half) {
                        pageNum = pagination.pages - maxVisible + 1 + i;
                      } else {
                        pageNum = page - half + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                            pageNum === page
                              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:shadow-md"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={page >= pagination.pages}
                  className="flex items-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              No Flash Deals Available
            </h2>
            <p className="text-slate-500">
              Check back soon — new deals drop regularly!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
