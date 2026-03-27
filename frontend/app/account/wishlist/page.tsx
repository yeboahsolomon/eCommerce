"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product } from "@/types";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Loader2, Heart, ShoppingCart, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";

interface WishlistItem {
  id: string;
  product: Product;
  addedAt: string;
}

export default function WishlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { addItem } = useCart();
  const { items, isLoading, removeFromWishlist } = useWishlist();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    await removeFromWishlist(itemId);
    setRemovingId(null);
  };

  const handleAddToCart = async (item: WishlistItem) => {
    await addItem(item.product.id, 1, item.product);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 gap-2 mb-6">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/account" className="hover:text-blue-600">Account</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">Wishlist</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Wishlist</h1>

      {!isAuthenticated && items.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium text-center sm:text-left">
            You are browsing as a guest. Create an account to save your wishlist permanently!
          </p>
          <Link href="/auth/register" className="whitespace-nowrap bg-blue-600 text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-blue-700 transition">
            Create Account
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-slate-900 mb-2">Your wishlist is empty</h2>
          <p className="text-slate-500 mb-6">Save items you love by clicking the heart icon</p>
          <Link href="/products" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden group">
              {/* Image */}
              <Link href={`/product/${item.product.id}`} className="relative aspect-square block bg-slate-100">
                {item.product.image ? (
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-10 w-10 text-slate-300" />
                  </div>
                )}
              </Link>

              {/* Details */}
              <div className="p-4">
                <Link href={`/product/${item.product.id}`}>
                  <h3 className="text-sm font-medium text-slate-900 line-clamp-2 hover:text-blue-600 mb-2">
                    {item.product.name}
                  </h3>
                </Link>
                <p className="text-lg font-bold text-slate-900 mb-3">
                  ₵{(
                    item.product.priceInPesewas !== undefined
                      ? item.product.priceInPesewas / 100
                      : (item.product as any).priceInCedis || 0
                  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={removingId === item.id}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    {removingId === item.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
