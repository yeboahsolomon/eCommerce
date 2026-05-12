"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Product } from "@/types";
import CountdownTimer from "./CountdownTimer";
import ProductCard from "./ProductCard";

interface FlashSalesBannerProps {
  products: Product[];
  isLoading: boolean;
}

export default function FlashSalesBanner({
  products,
  isLoading,
}: FlashSalesBannerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

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
    dragState.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
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

  if (isLoading) {
    return (
      <div className="w-full rounded-2xl overflow-hidden border border-slate-200">
        <div className="bg-[#E02B2B] px-4 py-3 h-[52px]" />
        <div className="flex gap-4 p-4 bg-[#FCEAE8]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[160px] sm:w-[200px] lg:w-[220px]">
              <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
                <div className="aspect-square bg-slate-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-6 bg-slate-100 rounded animate-pulse w-3/4 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  const flashSaleProducts = products.slice(0, 10);

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-[#FCEAE8] border border-slate-200">
      {/* 🔴 HEADER SECTION */}
      <div className="bg-[#E02B2B] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-400 fill-yellow-400" />
          <h2 className="text-white text-lg md:text-xl font-bold">Flash Sales</h2>
        </div>

        <div className="hidden md:flex items-center gap-2 text-white font-medium">
          <span className="text-sm">Time Left:</span>
          <div className="scale-90 origin-left flex items-center">
             <CountdownTimer hoursFromNow={8} />
          </div>
        </div>

        <Link
          href="/flash-sales"
          className="text-white text-sm font-medium hover:underline flex items-center"
        >
          See All <ChevronRight className="h-4 w-4 ml-0.5" />
        </Link>
      </div>

      {/* 📱 MOBILE COUNTDOWN (Visible only on small screens) */}
      <div className="md:hidden bg-[#E02B2B] px-4 pb-3 flex justify-center items-center gap-2 text-white border-t border-red-500/30">
        <span className="text-sm font-medium">Time Left:</span>
        <div className="scale-90 flex items-center">
           <CountdownTimer hoursFromNow={8} />
        </div>
      </div>

      {/* 🛒 PRODUCTS CAROUSEL — Uses standard ProductCard */}
      <div className="relative group/flash">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/60 border border-slate-100 text-slate-600 hover:text-slate-900 hover:shadow-xl transition-all duration-200 translate-x-1 opacity-0 group-hover/flash:opacity-100 hover:scale-110"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/60 border border-slate-100 text-slate-600 hover:text-slate-900 hover:shadow-xl transition-all duration-200 -translate-x-1 opacity-0 group-hover/flash:opacity-100 hover:scale-110"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Left gradient fade */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#FCEAE8] to-transparent z-10 pointer-events-none" />
        )}

        {/* Right gradient fade */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#FCEAE8] to-transparent z-10 pointer-events-none" />
        )}

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className={`flex gap-4 overflow-x-auto p-4 pb-5 scroll-smooth ${
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onScroll={checkScroll}
          style={{ scrollbarWidth: "none" }}
        >
          {flashSaleProducts.map((product, index) => (
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
  );
}
