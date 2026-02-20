
"use client";
import { memo, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star, ImageOff, Heart, Eye, MapPin, BadgeCheck } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
// import { QuickViewModal } from "./QuickViewModal"; // Assuming we want to create this later or just use placeholder logic
// Actually, user asked for "Quick view icon", implies functionality. 
// I'll add the button but maybe not full modal implementation yet unless I see requirements. 
// I'll make it trigger a toast "Quick View coming soon" or simple state if easy.
// I'll stick to UI for now.

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const { addItem, cart } = useCart(); 
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const discount = product.comparePriceInPesewas
    ? Math.round(((product.comparePriceInPesewas - product.priceInPesewas) / product.comparePriceInPesewas) * 100)
    : 0;

  const cartItem = cart?.items?.find((item) => item.productId === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    await addItem(product.id, 1, product);
    toast.success("Added to cart");
  }, [addItem, product]);

  const handleWishlist = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
  }, [isWishlisted]);

  const handleQuickView = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      toast.info("Quick view coming soon!");
  }, []);

  return (
    <div 
        className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-100"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* Image Section */}
      <Link href={`/product/${product.id}`} className="relative aspect-square overflow-hidden bg-slate-100 block">
        {/* Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
             {/* Discount Badge */}
            {discount > 0 && (
            <span className="w-fit rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                -{discount}%
            </span>
            )}
            {/* Seller Badge (New) */}
            {product.seller && (
                <span className="flex w-fit items-center gap-1 rounded-md bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                    <BadgeCheck className="h-3 w-3" />
                    <span className="max-w-[80px] truncate">{product.seller.businessName}</span>
                </span>
            )}
        </div>
        
        {/* Action Buttons (Right Side) */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2 transition-all duration-300 translate-x-10 group-hover:translate-x-0 opacity-0 group-hover:opacity-100">
            {/* Wishlist */}
            <button
            onClick={handleWishlist}
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-all duration-200 hover:scale-110 ${
                isWishlisted ? "text-red-500" : "text-slate-400 hover:text-red-500"
            }`}
            title="Add to Wishlist"
            >
            <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
            </button>
            {/* Quick View */}
            <button
            onClick={handleQuickView}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-md transition-all duration-200 hover:scale-110 hover:text-blue-600"
            title="Quick View"
            >
            <Eye className="h-4 w-4" />
            </button>
        </div>
        
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <ImageOff className="h-10 w-10 text-slate-300" />
          </div>
        )}

        {/* Add to Cart Overlay (Desktop) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full transition-transform duration-300 group-hover:translate-y-0 hidden md:block">
            <button
                onClick={handleAddToCart}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 flex items-center justify-center gap-2"
            >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
            </button>
        </div>
      </Link>

      {/* Details Section */}
      <div className="flex flex-1 flex-col p-3">
        {/* Category & Location Row */}
        <div className="flex items-center justify-between mb-1">
             <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider truncate max-w-[50%]">
                {product.category?.name}
            </p>
            {product.seller?.ghanaRegion && (
                <div className="flex items-center gap-0.5 text-[10px] text-slate-500 truncate max-w-[45%]">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{product.seller.ghanaRegion}</span>
                </div>
            )}
        </div>
        
        {/* Title */}
        <Link href={`/product/${product.id}`} className="mb-1 block">
          <h3 className="line-clamp-2 text-sm font-medium text-slate-800 transition-colors group-hover:text-blue-600" title={product.name}>
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="mb-2 flex items-center gap-1">
          <div className="flex">
             {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                    key={star} 
                    className={`h-3 w-3 ${star <= Math.round(product.averageRating || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} 
                />
             ))}
          </div>
          <span className="text-xs text-slate-400 ml-1">({product.reviewCount || 0})</span>
        </div>

        {/* Price & Mobile Add to Cart */}
        <div className="mt-auto flex items-end justify-between border-t border-slate-50 pt-3">
          <div className="flex flex-col">
             {product.comparePriceInPesewas && (
              <span className="text-[10px] font-medium text-slate-400 line-through">
                ₵{(product.comparePriceInPesewas / 100).toLocaleString()}
              </span>
            )}
            <span className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              ₵{(product.priceInPesewas / 100).toLocaleString()}
            </span>
          </div>

          {/* Mobile Only Add Button */}
           <button 
            onClick={handleAddToCart}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 md:hidden active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
