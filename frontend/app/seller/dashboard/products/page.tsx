"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@/types";
import Link from "next/link";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const formatCurrency = (amountInPesewas: number | undefined) => {
  return typeof amountInPesewas === 'number' 
    ? `₵${(amountInPesewas / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₵0.00`;
};

export default function SellerProductsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products', debouncedSearch, statusFilter, page],
    queryFn: async () => {
      const res = await api.getSellerProducts({ 
         search: debouncedSearch, 
         page,
         limit: 20
         // status is not currently in ProductQueryParams but we could add it locally or pass it
      });
      if (!res.success) throw new Error(res.message);
      return res.data;
    }
  });

  const products = data?.products || [];
  const pagination = data?.pagination;

  // Since backend filter by status isn't fully wired in `ProductQueryParams` type explicitly without custom params,
  // Let's rely on client-side filtering for demonstration if API doesn't handle it, 
  // or assume the API handles it if we pass it dynamically. Actually, we'll just filter client side for now.
  let filteredProducts = products;
  if (statusFilter === "ACTIVE") {
     filteredProducts = products.filter((p: any) => p.isActive);
  } else if (statusFilter === "DRAFT") {
     filteredProducts = products.filter((p: any) => !p.isActive);
  }

  const deleteMutation = useMutation({
     mutationFn: async (id: string) => {
        const res = await api.deleteProduct(id);
        // api.deleteProduct resolves to void on success
        return res;
     },
     onSuccess: () => {
        toast.success("Product deleted successfully");
        queryClient.invalidateQueries({ queryKey: ['seller-products'] });
        queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats'] });
     },
     onError: () => {
        toast.error("Failed to delete product");
     }
  });

  const toggleStatusMutation = useMutation({
     mutationFn: async (product: any) => {
        const newStatus = !product.isActive;
        const res = await api.updateProduct(product.id, { isActive: newStatus });
        if (!res.success) throw new Error(res.message);
        return { product, newStatus };
     },
     onSuccess: ({ newStatus }) => {
        toast.success(`Product ${newStatus ? 'activated' : 'deactivated'}`);
        queryClient.invalidateQueries({ queryKey: ['seller-products'] });
        queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats'] });
     },
     onError: () => {
        toast.error("Failed to update status");
     }
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (product: any) => {
     toggleStatusMutation.mutate(product);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500">Manage your product inventory</p>
        </div>
        <Link href="/seller/dashboard/products/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 w-full sm:w-auto justify-center shadow-sm">
           <Plus className="w-5 h-5" /> Add New Product
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4 shadow-sm">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
               type="text" 
               placeholder="Search products..." 
               value={search}
               onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
               }}
               className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
         </div>
         <div className="flex gap-2">
            <select 
               value={statusFilter}
               onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
               }}
               className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
            >
               <option value="ALL">All Status</option>
               <option value="ACTIVE">Active</option>
               <option value="DRAFT">Draft</option>
            </select>
         </div>
      </div>

      {isLoading ? (
         <div className="py-20 text-center flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
         </div>
      ) : filteredProducts.length === 0 ? (
         <div className="bg-white p-12 rounded-xl border border-slate-100 text-center shadow-sm">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
               <Package className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-bold mb-1">No products found</h3>
            <p className="text-slate-500 text-sm mb-4">Get started by creating your first product or try a different search term.</p>
            <Link href="/seller/dashboard/products/new" className="text-blue-600 font-bold hover:underline">
               Add Product
            </Link>
         </div>
      ) : (
         <>
            {/* Mobile Card Layout (visible < md) */}
            <div className="block md:hidden space-y-4">
               {filteredProducts.map((product: any) => (
                  <div key={product.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4">
                     <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                           {product.images?.[0] ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                 <Package className="w-6 h-6" />
                              </div>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="font-bold text-slate-900 truncate">{product.name}</p>
                           <p className="text-xs text-slate-500 mb-1">{product.category?.name || 'Uncategorized'}</p>
                           <p className="font-bold text-slate-900">{formatCurrency(product.priceInPesewas)}</p>
                        </div>
                     </div>
                     
                     <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex flex-col gap-1">
                           <span className={`text-xs ${product.stockQuantity <= 5 ? 'text-red-500 font-bold' : 'text-slate-600'}`}>
                              {product.stockQuantity} in stock
                           </span>
                           <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              product.isActive 
                                 ? 'bg-green-100 text-green-700' 
                                 : 'bg-slate-100 text-slate-600'
                           }`}>
                              {product.isActive ? 'Active' : 'Draft'}
                           </span>
                        </div>
                        <div className="flex items-center gap-1">
                           <button 
                              disabled={toggleStatusMutation.isPending}
                              onClick={() => handleToggleStatus(product)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                           >
                              {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                           </button>
                           <Link href={`/seller/dashboard/products/${product.id}/edit`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                              <Edit className="w-4 h-4" />
                           </Link>
                           <button 
                              disabled={deleteMutation.isPending}
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>

            {/* Desktop Table Layout (visible >= md) */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold tracking-wider">
                           <th className="px-6 py-4">Product</th>
                           <th className="px-6 py-4">Price</th>
                           <th className="px-6 py-4">Stock</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredProducts.map((product: any) => (
                           <tr key={product.id} className="hover:bg-slate-50 transition">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                       {product.images?.[0] ? (
                                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                       ) : (
                                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                                             <Package className="w-5 h-5" />
                                          </div>
                                       )}
                                    </div>
                                    <div className="min-w-0">
                                       <p className="font-bold text-slate-900 truncate max-w-xs">{product.name}</p>
                                       <p className="text-xs text-slate-500">{product.category?.name || 'Uncategorized'}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-900">
                                 {formatCurrency(product.priceInPesewas)}
                              </td>
                              <td className="px-6 py-4">
                                 <span className={`text-sm ${product.stockQuantity <= 5 ? 'text-red-500 font-bold' : 'text-slate-600'}`}>
                                    {product.stockQuantity} in stock
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                    product.isActive 
                                       ? 'bg-green-100 text-green-700' 
                                       : 'bg-slate-100 text-slate-600'
                                 }`}>
                                    {product.isActive ? 'Active' : 'Draft'}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button 
                                       disabled={toggleStatusMutation.isPending}
                                       onClick={() => handleToggleStatus(product)}
                                       className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                                       title={product.isActive ? "Deactivate" : "Activate"}
                                    >
                                       {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <Link href={`/seller/dashboard/products/${product.id}/edit`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                       <Edit className="w-4 h-4" />
                                    </Link>
                                    <button 
                                       disabled={deleteMutation.isPending}
                                       onClick={() => handleDelete(product.id)}
                                       className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                 <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600 disabled:opacity-50 transition"
                 >
                    <ChevronLeft className="w-4 h-4" /> Previous
                 </button>
                 <span className="text-sm text-slate-500 font-medium">Page {page} of {pagination.pages}</span>
                 <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600 disabled:opacity-50 transition"
                 >
                    Next <ChevronRight className="w-4 h-4" />
                 </button>
              </div>
            )}
         </>
      )}
    </div>
  );
}
