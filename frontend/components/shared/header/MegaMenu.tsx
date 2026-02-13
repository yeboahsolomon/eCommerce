"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  subcategories?: { id: string; name: string; slug: string }[];
}

interface MegaMenuProps {
  categories: Category[];
  isVisible: boolean;
  onClose: () => void;
}

export default function MegaMenu({ categories, isVisible, onClose }: MegaMenuProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="absolute top-full left-0 right-0 bg-white border-b border-t border-slate-100 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
      onMouseLeave={onClose}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Main Categories Navigation */}
          <div className="col-span-3 border-r border-slate-100 pr-6">
             <h3 className="font-bold text-slate-900 mb-4 px-2">Top Categories</h3>
             <ul className="space-y-1">
                {categories.slice(0, 8).map((cat) => (
                  <li key={cat.id}>
                    <Link 
                      href={`/categories/${cat.slug}`}
                      className="flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors group"
                      onClick={onClose}
                    >
                       {cat.name}
                       <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
                <li>
                    <Link href="/categories" className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-600 hover:underline mt-2">
                        View All Categories
                    </Link>
                </li>
             </ul>
          </div>

          {/* Subcategories Grid (Mocked content for now since API might not return deep nesting yet) */}
          <div className="col-span-6 grid grid-cols-2 gap-8 px-6">
             <div>
                <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wider">Featured Collections</h4>
                <ul className="space-y-2">
                    {['New Arrivals', 'Best Sellers', 'Trending Now', 'Official Stores', 'Flash Sales'].map(item => (
                        <li key={item}>
                             <Link href={`/search?q=${item}`} onClick={onClose} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                                {item}
                             </Link>
                        </li>
                    ))}
                </ul>
             </div>
             
             {/* Dynamic Subcategories from first category if available */}
             {categories[0] && (
                 <div>
                    <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wider">{categories[0].name}</h4>
                     <ul className="space-y-2">
                        {(categories[0].subcategories || ['Smartphones', 'Laptops', 'Audio', 'Accessories']).slice(0, 5).map((sub: any, idx: number) => (
                            <li key={idx}>
                                {typeof sub === 'string' ? (
                                    <Link href={`/categories/${categories[0].slug}`} onClick={onClose} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                                        {sub}
                                    </Link>
                                ) : (
                                    <Link href={`/categories/${categories[0].slug}/${sub.slug}`} onClick={onClose} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                                        {sub.name}
                                    </Link>
                                )}
                            </li>
                        ))}
                     </ul>
                 </div>
             )}
          </div>

          {/* Featured Product / Promo */}
          <div className="col-span-3 pl-6 border-l border-slate-100">
             <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-slate-100 group">
                <Image 
                    src="https://placehold.co/400x600/png?text=Featured+Sale" 
                    alt="Featured" 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                    <span className="text-white text-xs font-bold uppercase tracking-wider mb-2">Special Offer</span>
                    <h4 className="text-white text-xl font-bold mb-2">Summer Sale Up to 50% Off</h4>
                    <Link href="/deals" onClick={onClose} className="inline-flex items-center px-4 py-2 bg-white text-slate-900 text-sm font-bold rounded-full hover:bg-blue-50 transition-colors w-fit">
                        Shop Now
                    </Link>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
