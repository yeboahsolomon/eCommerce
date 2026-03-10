"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Wallet, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminPayouts({ page, limit: 20, status: statusFilter });
      if (res.success && res.data) {
        setPayouts(res.data.payouts || []);
        setTotalPages(res.data.pagination?.pages || 1);
      } else {
        toast.error("Failed to load payouts");
      }
    } catch (error) {
      toast.error("An error occurred while loading payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [page, statusFilter]);

  const handleApprove = async (id: string, sellerName: string) => {
    if (!confirm(`Are you sure you want to approve and transfer funds to ${sellerName}? This action cannot be undone.`)) {
      return;
    }
    
    setActionLoading(id);
    try {
      const res = await api.approvePayout(id);
      if (res.success) {
        toast.success(`Payout to ${sellerName} approved and transfer initiated.`);
        fetchPayouts();
      } else {
        toast.error(res.message || "Failed to approve payout");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string, sellerName: string) => {
    const reason = prompt(`Enter reason for cancelling payout for ${sellerName}:`);
    if (reason === null) return; // User cancelled prompt
    
    setActionLoading(id);
    try {
      const res = await api.cancelPayout(id, reason);
      if (res.success) {
        toast.success(`Payout to ${sellerName} cancelled.`);
        fetchPayouts();
      } else {
        toast.error(res.message || "Failed to cancel payout");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    PROCESSING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    COMPLETED: "bg-green-500/10 text-green-500 border-green-500/20",
    CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payout Requests</h1>
          <p className="text-sm text-slate-400 mt-1">Manage and approve seller withdrawals.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none bg-slate-800 border border-slate-700 text-sm text-white rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        {loading && payouts.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <Wallet className="w-12 h-12 mb-3 text-slate-600" />
            <p>No payout requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  <th className="px-6 py-4">Seller</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-800/80 transition group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{payout.businessName}</p>
                        <p className="text-xs text-slate-400">{payout.sellerName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white transition">
                        ₵{(payout.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-slate-700 px-2 py-1 rounded">
                          {payout.destinationNetwork}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-300">{payout.destinationNumber}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[120px]" title={payout.destinationName}>
                            {payout.destinationName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColors[payout.status]}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payout.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleApprove(payout.id, payout.businessName)}
                            disabled={actionLoading === payout.id}
                            className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg transition disabled:opacity-50"
                            title="Approve & Transfer Funds"
                          >
                            {actionLoading === payout.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCancel(payout.id, payout.businessName)}
                            disabled={actionLoading === payout.id}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition disabled:opacity-50"
                            title="Cancel Request"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {payout.transactionReference ? `Ref: ${payout.transactionReference}` : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination placeholder */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
