"use client";
import { memo, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star, ImageOff, Heart } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const { addItem, cart } = useCart(); 
  const [isWishlisted, setIsWishlisted] = useState(false);
  const discount = product.comparePriceInPesewas
    ? Math.round(((product.comparePriceInPesewas - product.priceInPesewas) / product.comparePriceInPesewas) * 100)
    : 0;

  // Calculate quantity of this specific product in cart
  const cartItem = cart?.items?.find((item) => item.productId === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = useCallback(async () => {
    await addItem(product.id, 1, product);
  }, [addItem, product]);

  const handleWishlist = useCallback(() => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
  }, [isWishlisted]);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg hover:border-slate-300">
      
      {/* Image Section */}
      <Link href={`/product/${product.id}`} className="relative aspect-square overflow-hidden bg-slate-100 block">
        {discount > 0 && (
          <span className="absolute top-2 left-2 z-10 rounded bg-red-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            -{discount}%
          </span>
        )}
        
        {/* Wishlist Button */}
        <button
          onClick={(e) => { e.preventDefault(); handleWishlist(); }}
          className={`absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 ${
            isWishlisted ? "text-red-500" : "text-slate-400 hover:text-red-500"
          }`}
          aria-label="Add to wishlist"
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
        </button>
        
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <ImageOff className="h-10 w-10 text-slate-300" />
          </div>
        )}
      </Link>

      {/* Details Section */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category */}
        <p className="mb-1 text-xs text-slate-500">{product.category.name}</p>
        
        {/* Title */}
        <Link href={`/product/${product.id}`} className="mb-2">
          <h3 className="line-clamp-2 text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="mb-3 flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs text-slate-600">{product.averageRating.toFixed(1)}</span>
        </div>

        {/* Price & Action */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900">
              ₵{(product.priceInPesewas / 100).toLocaleString()}
            </span>
            {product.comparePriceInPesewas && (
              <span className="text-xs text-slate-400 line-through">
                ₵{(product.comparePriceInPesewas / 100).toLocaleString()}
              </span>
            )}
          </div>

          <button 
            onClick={handleAddToCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-600 hover:text-white active:scale-95"
            aria-label="Add to cart"
          >
            <ShoppingCart className="h-5 w-5" />
            
            {/* Quantity Badge */}
            {quantity > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in">
                {quantity}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
