"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Zap } from "lucide-react";
import { Product } from "@/types";
import CountdownTimer from "./CountdownTimer";

interface FlashSalesBannerProps {
  products: Product[];
  isLoading: boolean;
}

export default function FlashSalesBanner({
  products,
  isLoading,
}: FlashSalesBannerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] bg-slate-100 rounded-lg animate-pulse" />
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  // To match Jumia style, we can use a subset of products for the banner (e.g. top 10)
  const flashSaleProducts = products.slice(0, 10);

  return (
    <div className="w-full rounded-md overflow-hidden bg-[#FCEAE8] border border-slate-200">
      {/* 🔴 HEADER SECTION */}
      <div className="bg-[#E02B2B] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-400 fill-yellow-400" />
          <h2 className="text-white text-lg md:text-xl font-bold">Flash Sales</h2>
        </div>

        <div className="hidden md:flex items-center gap-2 text-white font-medium">
          <span className="text-sm">Time Left:</span>
          {/* We reuse the CountdownTimer but might need to tweak its text color depending on how it's styled internally. 
              The existing CountdownTimer uses red text on white bg, so let's wrap it nicely. */}
          <div className="scale-90 origin-left flex items-center">
             <CountdownTimer hoursFromNow={8} />
          </div>
        </div>

        <Link
          href="/products?deals=true"
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

      {/* 🛒 PRODUCTS CAROUSEL */}
      <div className="relative group">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 p-4 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {flashSaleProducts.map((product) => {
            // Fake realistic stock progress calculation if real data isn't perfectly structured for it
            const stock = product.stockQuantity || 1;
            const maxAssumedStock = stock > 20 ? stock * 2 : 50;
            const progressPercentage = Math.min(
              100,
              Math.max(5, (stock / maxAssumedStock) * 100)
            );

            return (
              <Link
                href={`/product/${product.slug}`}
                key={product.id}
                className="snap-start flex-shrink-0 w-[160px] md:w-[180px] bg-white rounded-md p-3 hover:shadow-md transition-shadow relative block"
              >
                {/* Image */}
                <div className="relative aspect-square mb-2 bg-white flex items-center justify-center overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="180px"
                      className="object-contain"
                    />
                  ) : (
                    <div className="bg-slate-100 w-full h-full" />
                  )}
                  
                  {/* Discount Badge */}
                  {product.discountPercentage && (
                    <div className="absolute top-0 right-0 bg-orange-100 text-orange-500 text-xs font-bold px-1.5 py-0.5 rounded">
                      -{product.discountPercentage}%
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <h3 className="text-sm text-slate-800 line-clamp-2 min-h-[40px] leading-tight">
                    {product.name}
                  </h3>
                  
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-slate-900 leading-none">
                      GH₵ {(product.priceInPesewas / 100).toLocaleString()}
                    </span>
                    {product.comparePriceInPesewas && (
                      <span className="text-xs text-slate-400 line-through mt-0.5">
                        GH₵ {(product.comparePriceInPesewas / 100).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Stock Progress */}
                  <div className="pt-2">
                    <div className="text-[10px] text-slate-500 mb-1 font-medium">
                      {product.stockQuantity} items left
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
