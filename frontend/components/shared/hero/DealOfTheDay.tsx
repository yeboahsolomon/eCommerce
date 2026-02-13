"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Timer } from 'lucide-react';
import CountdownTimer from '@/components/ui/CountdownTimer';

export default function DealOfTheDay() {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 h-full flex flex-col shadow-sm relative overflow-hidden group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
          <Timer className="h-5 w-5 text-red-600" />
          Deal of the Day
        </h3>
        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
          -25% OFF
        </span>
      </div>

      {/* Product Image */}
      <div className="relative h-48 w-full mb-4 bg-slate-50 rounded-xl overflow-hidden group-hover:bg-slate-100 transition-colors">
        <Image 
          src="https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=400&auto=format&fit=crop" 
          alt="Royal Aroma Rice 5kg"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover p-0 group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 flex flex-col">
        <h4 className="font-semibold text-slate-800 text-base mb-1 line-clamp-2">
          Royal Aroma Perfume Rice - 5kg Bag
        </h4>
        
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-extrabold text-slate-900">GH₵ 85.00</span>
          <span className="text-sm text-slate-400 line-through">GH₵ 115.00</span>
        </div>

        {/* Stock Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">Available: <span className="text-slate-900 font-bold">12</span></span>
            <span className="text-slate-500">Sold: <span className="text-slate-900 font-bold">48</span></span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 w-[80%] rounded-full"></div>
          </div>
        </div>

        {/* Timer & Access */}
        <div className="mt-auto">
          <p className="text-xs text-slate-400 text-center mb-2 uppercase tracking-wide">Ends In</p>
          <CountdownTimer hoursFromNow={12} />
          
          <Link 
            href="/products/deal-of-day-id" 
            className="mt-4 w-full flex items-center justify-center bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
          >
            Buy Now
          </Link>
        </div>
      </div>
    </div>
  );
}
