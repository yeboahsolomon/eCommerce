"use client";

import React from 'react';
import { Users, Star, ShoppingBag } from 'lucide-react';

export default function SocialProof() {
  return (
    <div className="bg-slate-50 border-y border-slate-100 py-4 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 md:gap-12 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-100 rounded-full text-green-600">
            <Users className="h-4 w-4" />
          </div>
          <span><strong>2,500+</strong> happy shoppers in Jaman South</span>
        </div>
        
        <div className="hidden sm:block h-4 w-px bg-slate-200"></div>
        
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-yellow-100 rounded-full text-yellow-600">
            <Star className="h-4 w-4" />
          </div>
          <span><strong>500+</strong> verified local sellers</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200"></div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-full text-blue-600">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <span><strong>10,000+</strong> orders delivered</span>
        </div>
      </div>
    </div>
  );
}
