"use client";

import { api } from "@/lib/api";
import { Product } from "@/types";
import { PRODUCTS } from "@/lib/dummy-data";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Loader2, Plus, Search, Edit2, Trash2, 
  ImageOff, Eye, Package 
} from "lucide-react";
import { toast } from "sonner";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.getProducts({ limit: 100 });
        if (res.success && res.data?.products) {
          setProducts(res.data.products as Product[]);
        } else {
          setProducts(PRODUCTS);
        }
      } catch (err) {
        setProducts(PRODUCTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    setDeletingId(productId);
    try {
      await api.deleteProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
      toast.success("Product deleted");
    } catch (err) {
      toast.error("Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-slate-400 text-sm">{products.length} total products</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Products Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Product</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Category</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Price</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Stock</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <Image src={product.image} alt={product.name} width={40} height={40} className="object-cover h-full w-full" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ImageOff className="h-4 w-4 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-white line-clamp-1">{product.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400">{product.category?.name || "—"}</td>
                <td className="py-3 px-4 text-white font-medium">
                  ₵{(product.priceInPesewas / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4">
                  <span className={`${product.stockQuantity && product.stockQuantity > 0 ? "text-slate-300" : "text-red-400"}`}>
                    {product.stockQuantity ?? 0}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    product.inStock ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {product.inStock ? "Active" : "Out of Stock"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/product/${product.id}`} target="_blank" className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    >
                      {deletingId === product.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}
