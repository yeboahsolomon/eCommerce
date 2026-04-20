"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Timer, Star, ShoppingBag, Flame } from 'lucide-react';
import CountdownTimer from '@/components/ui/CountdownTimer';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DealOfTheDay as DealOfTheDayType } from '@/types';

export default function DealOfTheDay() {
  const { data: dealResponse, isLoading } = useQuery({
    queryKey: ['deal-of-the-day'],
    queryFn: async () => {
      const res = await api.getDealOfTheDay();
      if (res.success && res.data) {
        return res.data as DealOfTheDayType;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-3xl h-full min-h-[450px] flex flex-col shadow-sm relative overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-slate-800/50" />
        <div className="relative z-10 flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-auto">
            <div className="h-8 w-32 bg-slate-700/50 rounded-full" />
            <div className="h-8 w-20 bg-slate-700/50 rounded-full" />
          </div>
          <div className="mt-auto flex flex-col gap-4">
            <div className="h-6 w-3/4 bg-slate-700/50 rounded" />
            <div className="h-8 w-1/2 bg-slate-700/50 rounded" />
            <div className="h-2 w-full bg-slate-700/50 rounded-full" />
            <div className="h-12 w-full bg-slate-700/50 rounded-xl mt-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!dealResponse || (!dealResponse.product.image && !dealResponse.product.images?.length)) {
    return (
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 h-full min-h-[450px] flex flex-col shadow-sm items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
          <Timer className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="font-bold text-xl text-slate-900 mb-2">Deal of the Day</h3>
        <p className="text-slate-500">Check back soon for our next exclusive deal!</p>
      </div>
    );
  }

  const { product, deal } = dealResponse;

  const formatPrice = (cedis: number) => cedis.toFixed(2);
  const stockProgressWidth = Math.min(deal.soldPercentage, 100);

  // Safely get an image URL
  const imageUrl = product.image || (product.images && product.images[0]?.url) || '';

  return (
    <div className="relative w-full h-full min-h-[450px] rounded-3xl overflow-hidden group shadow-xl bg-slate-900 flex flex-col isolation-auto">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 bg-slate-800">
        <Image 
          src={imageUrl} 
          alt={product.name}
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-110 transition-transform duration-1000 ease-out opacity-90"
        />
        {/* Gradient overlays for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/20" />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-500" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-6 sm:p-8">
        
        {/* Top Badges */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-auto">
          <span className="bg-red-600/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-red-500/30">
            <Flame className="h-4 w-4 text-yellow-300" />
            Deal of the Day
          </span>
          <span className="bg-yellow-400 text-yellow-900 text-xs font-extrabold px-2.5 py-1.5 rounded-full uppercase tracking-wider shadow-lg border border-yellow-300 shrink-0 mt-0.5">
            -{deal.discountPercentage}% OFF
          </span>
        </div>

        {/* Bottom Details */}
        <div className="mt-auto flex flex-col gap-3">
          <div className="space-y-1">
            <h4 className="font-bold text-white text-xl sm:text-2xl leading-tight line-clamp-2 text-shadow-sm">
              {product.name}
            </h4>
            
            {/* Rating */}
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 drop-shadow-sm" />
                <span className="text-sm text-white font-medium drop-shadow-sm">{product.averageRating.toFixed(1)}</span>
                <span className="text-sm text-white/70 drop-shadow-sm">({product.reviewCount} reviews)</span>
              </div>
            )}
          </div>
          
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white drop-shadow-md">GH₵ {formatPrice(product.priceInCedis)}</span>
            <span className="text-lg text-white/60 line-through font-medium">GH₵ {formatPrice(product.comparePriceInCedis)}</span>
          </div>

          {/* Stock Progress */}
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs text-white/90 font-medium tracking-wide">
              <span>Available: <strong className="text-white">{deal.stockAvailable}</strong></span>
              <span>Sold: <strong className="text-white">{deal.stockSold}</strong></span>
            </div>
            <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-red-500 rounded-full transition-all duration-1000 relative"
                style={{ width: `${Math.max(stockProgressWidth, 3)}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Timer & CTA */}
          <div className="flex flex-col gap-4 pt-4 border-t border-white/10 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70 uppercase tracking-widest font-bold">Ends In</span>
              <CountdownTimer targetDate={deal.endsAt} variant="dark" />
            </div>
            
            <Link 
              href={`/product/${product.slug}`}
              className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 py-3.5 rounded-xl font-bold text-[15px] hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
            >
              <ShoppingBag className="h-5 w-5" />
              Claim Deal Now
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
