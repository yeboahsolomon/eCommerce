"use client";

import { useRef, useState, useEffect, useCallback, memo } from "react";
import { ChevronLeft, ChevronRight, LucideIcon } from "lucide-react";
import ProductCard from "./ProductCard";
import { Product } from "@/types";

interface ProductCarouselProps {
  /** Section title */
  title: string;
  /** Section subtitle */
  subtitle?: string;
  /** Icon component to display next to the title */
  icon?: LucideIcon;
  /** Icon color classes (e.g. "text-orange-500") */
  iconColor?: string;
  /** Icon background classes (e.g. "bg-orange-50") */
  iconBg?: string;
  /** Products to display in the carousel */
  products: Product[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Optional accent gradient for the section header underline */
  accentGradient?: string;
}

/**
 * A premium horizontal-scroll product carousel used for all homepage
 * recommendation feeds. Features:
 * - Smooth grab-to-scroll on desktop, native swipe on mobile
 * - Navigational arrows with visibility based on scroll position
 * - Gradient edge fades indicating more content
 * - Skeleton loading state
 * - Staggered entrance animations
 */
function ProductCarousel({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
  products,
  isLoading = false,
  accentGradient = "from-blue-500 to-indigo-500",
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  // ── Check scroll position to toggle arrow visibility ──
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll, products]);

  // ── Arrow click handlers ──
  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by roughly 2.5 card widths for a satisfying jump
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  // ── Mouse drag-to-scroll (desktop) ──
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
    // Keep isDragging true briefly to prevent click-through on links
    setTimeout(() => setIsDragging(false), 50);
  }, []);

  // Don't render if empty and not loading
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="relative">
      {/* ── Section Header ── */}
      <div className="flex items-center gap-3 mb-5">
        {Icon && (
          <div
            className={`hidden sm:flex h-10 w-10 rounded-xl ${iconBg} items-center justify-center flex-shrink-0`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-slate-500 text-sm mt-0.5 truncate">{subtitle}</p>
          )}
          {/* Accent underline */}
          <div
            className={`h-0.5 w-12 mt-2 rounded-full bg-gradient-to-r ${accentGradient} opacity-60`}
          />
        </div>
      </div>

      {/* ── Carousel Container ── */}
      <div className="relative group/carousel">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/60 border border-slate-100 text-slate-600 hover:text-slate-900 hover:shadow-xl transition-all duration-200 -translate-x-1/2 opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:translate-x-0 hover:scale-110"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/60 border border-slate-100 text-slate-600 hover:text-slate-900 hover:shadow-xl transition-all duration-200 translate-x-1/2 opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:translate-x-0 hover:scale-110"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Left gradient fade */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        )}

        {/* Right gradient fade */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        )}

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className={`flex gap-4 overflow-x-auto pb-2 scroll-smooth carousel-scrollbar ${
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ scrollbarWidth: "none" }}
        >
          {isLoading
            ? /* Skeleton cards */
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[160px] sm:w-[200px] lg:w-[220px]"
                >
                  <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
                    <div className="aspect-square bg-slate-100 animate-pulse" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                      <div className="h-6 bg-slate-100 rounded animate-pulse w-3/4 mt-2" />
                    </div>
                  </div>
                </div>
              ))
            : products.map((product, index) => (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-[160px] sm:w-[200px] lg:w-[220px] animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 0.04}s`,
                    animationFillMode: "backwards",
                    // Prevent click-through during drag
                    pointerEvents: isDragging ? "none" : "auto",
                  }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

export default memo(ProductCarousel);
