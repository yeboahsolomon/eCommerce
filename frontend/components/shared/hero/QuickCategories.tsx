"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Shirt, 
  ShoppingBasket, 
  Tractor, 
  Smartphone, 
  Home, 
  Heart, 
  Hammer, 
  BookOpen 
} from 'lucide-react';

const categories = [
  { icon: Shirt, label: "Fashion", href: "/products?category=fashion", color: "bg-pink-100 text-pink-600" },
  { icon: ShoppingBasket, label: "Groceries", href: "/products?category=food-groceries", color: "bg-orange-100 text-orange-600" },
  { icon: Tractor, label: "Farm Tools", href: "/products?category=agriculture", color: "bg-green-100 text-green-600" },
  { icon: Smartphone, label: "Electronics", href: "/products?category=electronics", color: "bg-blue-100 text-blue-600" },
  { icon: Home, label: "Home", href: "/products?category=home-kitchen", color: "bg-purple-100 text-purple-600" },
  { icon: Heart, label: "Beauty", href: "/products?category=beauty", color: "bg-red-100 text-red-600" },
  { icon: Hammer, label: "Building", href: "/products?category=building", color: "bg-stone-100 text-stone-600" },
  { icon: BookOpen, label: "Education", href: "/products?category=education", color: "bg-yellow-100 text-yellow-600" },
];

export default function QuickCategories() {
  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-bold text-slate-800">Quick Categories</h3>
        <Link href="/products" className="text-xs font-semibold text-green-700 hover:text-green-800">
          View All
        </Link>
      </div>
      
      <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 sm:gap-6 sm:flex-wrap sm:justify-start scrollbar-hide">
        {categories.map((cat, idx) => (
          <Link 
            key={idx} 
            href={cat.href}
            className="flex flex-col items-center gap-2 group min-w-[72px] sm:min-w-[80px]"
          >
            <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-full ${cat.color} flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm group-hover:shadow-md`}>
              <cat.icon className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-700 text-center group-hover:text-slate-900">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
