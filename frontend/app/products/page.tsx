"use client";

import ProductCard from "@/components/ui/ProductCard";
import { api } from "@/lib/api";
import { PRODUCTS } from "@/lib/dummy-data";
import { Product } from "@/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.getProducts();
        if (res.success && res.data?.products) {
          setProducts(res.data.products as Product[]);
        } else {
          // Fallback to dummy data if API fails
          console.log("API unavailable, using dummy data");
          setProducts(PRODUCTS);
        }
      } catch (err) {
        // Fallback to dummy data on network error
        console.log("Network error, using dummy data");
        setProducts(PRODUCTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen pb-24 md:pb-12">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center text-sm text-slate-500 gap-2">
        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <span className="text-slate-900 font-medium">All Products</span>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900">All Products</h1>
          <p className="text-slate-500">{products.length} items</p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {products.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500">
                    No products found.
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
