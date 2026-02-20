"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

const formatCurrency = (amountInPesewas: number) => {
  return typeof amountInPesewas === 'number' 
    ? `₵${(amountInPesewas / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₵0.00`;
};

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
  Package
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

export default function SellerProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // In a real app, pass params to API
      const res = await api.getSellerProducts({ 
         search: debouncedSearch, 
         // status: statusFilter !== 'ALL' ? statusFilter : undefined 
         // Add status to type if backend supports it
      });
      if (res.success && res.data) {
        setProducts(res.data.products);
      }
    } catch (error) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
      const res = await api.deleteProduct(id);
      // Backend returns void on success, check api.request impl
      // Assuming success if no error thrown or check return
      toast.success("Product deleted");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const toggleStatus = async (product: any) => {
    try {
      const newStatus = !product.isActive;
      const res = await api.updateProduct(product.id, { isActive: newStatus });
      if (res.success) {
        toast.success(`Product ${newStatus ? 'activated' : 'deactivated'}`);
        fetchProducts();
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500">Manage your product inventory</p>
        </div>
        <Link href="/seller/dashboard/products/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 w-full sm:w-auto justify-center">
           <Plus className="w-5 h-5" /> Add New Product
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
               type="text" 
               placeholder="Search products..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
         </div>
         <div className="flex gap-2">
            <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
            >
               <option value="ALL">All Status</option>
               <option value="ACTIVE">Active</option>
               <option value="DRAFT">Draft</option>
            </select>
         </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
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
                  {loading ? (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                           <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                        </td>
                     </tr>
                  ) : products.length === 0 ? (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                           <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Package className="w-8 h-8 text-slate-300" />
                           </div>
                           <h3 className="text-slate-900 font-bold mb-1">No products found</h3>
                           <p className="text-slate-500 text-sm mb-4">Get started by creating your first product</p>
                           <Link href="/seller/dashboard/products/new" className="text-blue-600 font-bold hover:underline">
                              Add Product
                           </Link>
                        </td>
                     </tr>
                  ) : (
                     products.map((product) => (
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
                                    <p className="text-xs text-slate-500">{product.category?.name}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4 font-medium text-slate-900">
                              {formatCurrency(product.price)}
                           </td>
                           <td className="px-6 py-4">
                              <span className={`text-sm ${product.stockQuantity <= 5 ? 'text-red-500 font-bold' : 'text-slate-600'}`}>
                                 {product.stockQuantity} in stock
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
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
                                    onClick={() => toggleStatus(product)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title={product.isActive ? "Deactivate" : "Activate"}
                                 >
                                    {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                 </button>
                                 <Link href={`/seller/dashboard/products/${product.id}/edit`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                    <Edit className="w-4 h-4" />
                                 </Link>
                                 <button 
                                    onClick={() => handleDelete(product.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
