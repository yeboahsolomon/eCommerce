
"use client";
import { memo, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Star, ImageOff, Heart, MapPin, BadgeCheck, SlidersHorizontal } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const { addItem, cart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const [imgError, setImgError] = useState(false);
  const router = useRouter();

  const discount = product.comparePriceInPesewas
    ? Math.round(((product.comparePriceInPesewas - product.priceInPesewas) / product.comparePriceInPesewas) * 100)
    : 0;

  const cartItem = cart?.items?.find((item) => item.productId === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.hasVariants) {
      router.push(`/product/${product.id}`);
      return;
    }
    await addItem(product.id, 1, product);
  }, [addItem, product, router]);

  const handleWishlist = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product);
  }, [toggleWishlist, product]);

  const priceInCedis = product.priceInPesewas / 100;
  const comparePriceInCedis = product.comparePriceInPesewas ? product.comparePriceInPesewas / 100 : null;

  // Format price with proper decimal handling
  const formatPrice = (price: number) => {
    const whole = Math.floor(price);
    const decimal = Math.round((price - whole) * 100);
    return { whole: whole.toLocaleString(), decimal: decimal.toString().padStart(2, '0') };
  };

  const mainPrice = formatPrice(priceInCedis);

  return (
    <Link
      href={`/product/${product.id}`}
      className="product-card group relative flex flex-col rounded-2xl bg-white overflow-hidden transition-all duration-400 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 hover:border-slate-200/80"
      style={{
        willChange: 'transform, box-shadow',
      }}
    >

      {/* ─── Image Section ─── */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">

        {/* Discount Badge — top-left */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg shadow-rose-500/25 tracking-wide">
              −{discount}%
            </span>
          </div>
        )}

        {/* Wishlist Button — top-right, always visible */}
        <button
          onClick={handleWishlist}
          className={`absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 shadow-sm ${
            isWishlisted
              ? "bg-rose-500 text-white shadow-rose-500/30"
              : "bg-white/80 text-slate-400 hover:bg-white hover:text-rose-500 hover:shadow-md"
          }`}
          title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <Heart className={`h-4 w-4 transition-transform duration-200 ${isWishlisted ? "fill-current scale-110" : "group-hover:scale-105"}`} />
        </button>

        {/* Product Image */}
        {product.image && !imgError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-10 w-10 text-slate-200" />
          </div>
        )}

        {/* Hover Overlay — Add to Cart */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
          <div className="p-3 pt-6 bg-gradient-to-t from-white/95 via-white/80 to-transparent">
            <button
              onClick={handleAddToCart}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-blue-600 active:scale-[0.97] shadow-lg shadow-slate-900/20"
            >
              {product.hasVariants ? (
                <>
                  <SlidersHorizontal className="h-4 w-4" />
                  Select Options
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  {quantity > 0 ? `In Cart (${quantity})` : "Add to Cart"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Details Section ─── */}
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-4 gap-1.5">

        {/* Category & Location */}
        <div className="flex items-center gap-2 min-h-[18px]">
          {product.category?.name && (
            <span className="text-[11px] font-medium text-blue-600/80 truncate">
              {product.category.name}
            </span>
          )}
          {product.category?.name && product.seller?.ghanaRegion && (
            <span className="text-slate-200">·</span>
          )}
          {product.seller?.ghanaRegion && (
            <span className="flex items-center gap-0.5 text-[11px] text-slate-400 truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {product.seller.ghanaRegion}
            </span>
          )}
        </div>

        {/* Product Name */}
        <h3
          className="text-[13px] sm:text-sm font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors duration-200"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Rating */}
        {(product.averageRating > 0 || product.reviewCount > 0) && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(product.averageRating || 0)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-100 text-slate-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              ({product.reviewCount || 0})
            </span>
          </div>
        )}

        {/* Seller Badge */}
        {product.seller && (
          <div className="flex items-center gap-1 mt-0.5">
            <BadgeCheck className="h-3 w-3 text-blue-500 flex-shrink-0" />
            <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
              {product.seller.businessName}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-h-1" />

        {/* Price & Mobile Cart Button */}
        <div className="flex items-end justify-between mt-1 pt-2.5 border-t border-slate-100/80">
          <div className="flex flex-col">
            {comparePriceInCedis && (
              <span className="text-[11px] text-slate-400 line-through font-medium leading-none mb-0.5">
                ₵{comparePriceInCedis.toLocaleString()}
              </span>
            )}
            <div className="flex items-baseline gap-0.5">
              <span className="text-[13px] font-semibold text-slate-500 leading-none">₵</span>
              <span className="text-xl sm:text-[22px] font-extrabold text-slate-900 leading-none tracking-tight tabular-nums">
                {mainPrice.whole}
              </span>
              <span className="text-[11px] font-bold text-slate-400 leading-none">.{mainPrice.decimal}</span>
            </div>
          </div>

          {/* Mobile Cart Button */}
          <button
            onClick={handleAddToCart}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 md:hidden active:scale-95 transition-all duration-200 hover:bg-blue-600 hover:text-white"
            title={product.hasVariants ? "Select Options" : "Add to Cart"}
          >
            {product.hasVariants ? (
              <SlidersHorizontal className="h-4 w-4" />
            ) : quantity > 0 ? (
              <span className="text-[11px] font-bold">{quantity}</span>
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}

export default memo(ProductCard);
