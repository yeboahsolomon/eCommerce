"use client";

import { api } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, Search, ShoppingBag, Eye, ChevronLeft, ChevronRight,
  Ban, CheckCircle, MapPin,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchSellers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminSellers({
        page,
        limit: 15,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res.success && res.data) {
        setSellers(res.data.sellers || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);
  useEffect(() => { setPage(1); }, [statusFilter, searchQuery]);

  const handleSuspend = async (sellerId: string) => {
    if (!confirm("Suspend this seller?")) return;
    setActionId(sellerId);
    try {
      const res = await api.suspendSeller(sellerId);
      if (res.success) {
        toast.success("Seller suspended");
        fetchSellers();
      } else toast.error(res.message || "Failed");
    } catch { toast.error("Failed to suspend seller"); }
    finally { setActionId(null); }
  };

  const handleActivate = async (sellerId: string) => {
    setActionId(sellerId);
    try {
      const res = await api.activateSeller(sellerId);
      if (res.success) {
        toast.success("Seller activated");
        fetchSellers();
      } else toast.error(res.message || "Failed");
    } catch { toast.error("Failed to activate seller"); }
    finally { setActionId(null); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sellers</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage platform sellers
          {pagination && <span> · {pagination.total} total</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search sellers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All Sellers</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : sellers.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Seller</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Region</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Products</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Orders</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Commission</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {sellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-slate-700/20 transition">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-white text-sm">{seller.businessName}</p>
                          <p className="text-xs text-slate-500">{seller.name} · {seller.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{seller.ghanaRegion || "—"}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{seller.productCount}</td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{seller.orderCount}</td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{seller.commissionRate || 5}%</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded ${
                          seller.isActive && seller.status !== "SUSPENDED"
                            ? "bg-green-500/15 text-green-400 border border-green-500/30"
                            : "bg-red-500/15 text-red-400 border border-red-500/30"
                        }`}>
                          {seller.status === "SUSPENDED" ? "SUSPENDED" : seller.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/sellers/${seller.sellerId || seller.id}`}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {seller.isActive && seller.status !== "SUSPENDED" ? (
                            <button
                              onClick={() => handleSuspend(seller.sellerId || seller.id)}
                              disabled={actionId === (seller.sellerId || seller.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-30"
                              title="Suspend"
                            >
                              {actionId === (seller.sellerId || seller.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(seller.sellerId || seller.id)}
                              disabled={actionId === (seller.sellerId || seller.id)}
                              className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition disabled:opacity-30"
                              title="Activate"
                            >
                              {actionId === (seller.sellerId || seller.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/30">
                <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 transition">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage(Math.min(pagination.pages, page + 1))} disabled={page >= pagination.pages}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 transition">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <ShoppingBag className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No sellers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
