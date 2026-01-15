"use client"; // Client side for interactivity

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star } from "lucide-react";
import { Product } from "@/types";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart(); // Get the function
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md">
      
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {discount > 0 && (
          <span className="absolute top-2 left-2 z-10 rounded bg-red-500 px-2 py-1 text-[10px] font-bold text-white">
            -{discount}%
          </span>
        )}
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
        />
      </div>

      {/* Details Section */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category */}
        <p className="mb-1 text-xs text-slate-500">{product.category}</p>
        
        {/* Title */}
        <Link href={`/product/${product.id}`} className="mb-2">
          <h3 className="line-clamp-2 text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="mb-3 flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs text-slate-600">{product.rating.toFixed(1)}</span>
        </div>

        {/* Price & Action */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900">
              ₵{product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-slate-400 line-through">
                ₵{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <button 
            onClick={() => addItem(product)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-600 hover:text-white active:scale-95"
            aria-label="Add to cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
