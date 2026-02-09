"use client";

import ProductCard from "@/components/ui/ProductCard";
import { api } from "@/lib/api";
import { Product } from "@/types";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.getFeaturedProducts(8);
        if (res.success && res.data?.products) {
          setProducts(res.data.products as Product[]);
        } else {
          setError(res.message || "Failed to load products");
        }
      } catch (err) {
        setError("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="bg-blue-600 rounded-3xl p-8 text-white sm:p-12 overflow-hidden relative">
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Best Deals in Drobo</h1>
          <p className="mb-6 text-blue-100 text-lg">
            Shop local favorites and international brands. Fast delivery to your doorstep.
          </p>
          <Link href="/products" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-full font-bold hover:bg-blue-50 transition shadow-lg">
            Shop Now
          </Link>
        </div>
        {/* Abstract Circle Decoration */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500 opacity-50 blur-3xl"></div>
      </section>

      {/* Featured Products Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Weekly Best Sellers</h2>
          <Link href="/products" className="text-sm font-medium text-blue-600 hover:underline">
            View All
          </Link>
        </div>
        
        {/* THE GRID: 2 columns on mobile, 4 on desktop */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
           <div className="text-center py-20 text-red-500">
             {error}
           </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {products.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500">
                    No featured products available at the moment.
                </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
