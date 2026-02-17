"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import { useEffect, useState } from "react";
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
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await api.getWishlist();
        if (res.success && res.data?.items) {
          setItems(res.data.items as unknown as WishlistItem[]);
        }
      } catch (err) {
        console.error("Failed to fetch wishlist:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchWishlist();
    }
  }, [isAuthenticated, authLoading]);

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      await api.removeFromWishlist(itemId);
      setItems(items.filter((item) => item.id !== itemId));
      toast.success("Removed from wishlist");
    } catch (err) {
      toast.error("Failed to remove item");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    await addItem(item.product.id, 1, item.product);
    toast.success("Added to cart");
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">Please login to view your wishlist</p>
        <Link href="/auth/login" className="text-blue-600 font-medium hover:underline">
          Sign In
        </Link>
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
                  ₵{(item.product.priceInPesewas / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
