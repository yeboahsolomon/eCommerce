"use client";

import ProductCard from "@/components/ui/ProductCard";
import VirtualProductGrid from "@/components/ui/VirtualProductGrid";
import { api } from "@/lib/api";
import { Product } from "@/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { useSearchParams } from "next/navigation";

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const sellerId = searchParams.get("seller");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const params = sellerId ? { seller: sellerId } : undefined;
        const res = await api.getProducts(params);
        if (res.success && res.data?.products) {
          setProducts(res.data.products as Product[]);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [sellerId]);

  return (
    <div className="bg-slate-50 min-h-screen pb-24 md:pb-12">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumbs />
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {sellerId ? "All products" : "All Products"}
          </h1>
          <p className="text-slate-500">{products.length} items</p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : products.length > 0 ? (
          <VirtualProductGrid products={products} />
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Products Found</h2>
            <p className="text-slate-500">This seller currently has no active products listed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="bg-slate-50 min-h-screen flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}

