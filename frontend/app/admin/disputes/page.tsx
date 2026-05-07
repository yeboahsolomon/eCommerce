"use client";

import { useState } from "react";
import { 
  AlertTriangle, Flag, CheckCircle2, ShieldAlert, 
  XCircle, Clock, Shield, X, Eye
} from "lucide-react";

import { useEffect } from "react";
import { api } from "@/lib/api";

export interface Dispute {
  id: string;
  orderNumber: string;
  customerName: string;
  sellerName: string;
  reason: string;
  status: "Open" | "Under Review" | "Resolved" | "Escalated" | string;
  date: string;
}

export interface FlaggedProduct {
  id: string;
  productName: string;
  sellerName: string;
  reason: string;
  reportedBy: string;
  status: string;
  date: string;
}

export default function DisputesPage() {
  const [activeTab, setActiveTab] = useState<"disputes" | "flagged">("disputes");
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [flaggedProducts, setFlaggedProducts] = useState<FlaggedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [disputesRes, flaggedRes] = await Promise.all([
        api.getAdminDisputes(),
        api.getAdminFlaggedProducts()
      ]);
      
      if (disputesRes.success) setDisputes(disputesRes.data);
      if (flaggedRes.success) setFlaggedProducts(flaggedRes.data);
    } catch (error) {
      console.error("Failed to load disputes/flags:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateDisputeStatus = async (id: string, status: string) => {
    try {
      await api.updateAdminDisputeStatus(id, status);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Failed to update dispute:", error);
      alert("Failed to update dispute status");
    }
  };

  const handleUpdateFlaggedStatus = async (id: string, status: string) => {
    try {
      await api.updateAdminFlaggedProductStatus(id, status);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Failed to update flagged product:", error);
      alert("Failed to update flagged product status");
    }
  };

  const getDisputeStatusBadge = (status: Dispute["status"]) => {
    switch(status) {
      case "Open": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase"><AlertTriangle className="w-3 h-3" /> Open</span>;
      case "Under Review": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 uppercase"><Clock className="w-3 h-3" /> Under Review</span>;
      case "Escalated": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 uppercase"><ShieldAlert className="w-3 h-3" /> Escalated</span>;
      case "Resolved": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30 uppercase"><CheckCircle2 className="w-3 h-3" /> Resolved</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Disputes & Reports</h1>
        <p className="text-sm text-slate-400 mt-1">Manage user conflicts, order disputes, and flagged products.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-lg w-fit border border-slate-700/50 mb-6">
        <button
          onClick={() => setActiveTab("disputes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "disputes" 
              ? "bg-slate-700 text-white shadow" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Order Disputes
        </button>
        <button
          onClick={() => setActiveTab("flagged")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "flagged" 
              ? "bg-slate-700 text-white shadow" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Flag className="w-4 h-4" />
          Flagged Products
        </button>
      </div>

      {/* Disputes Table */}
      {activeTab === "disputes" && (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900/40 text-slate-400 uppercase text-xs font-semibold border-b border-slate-700/50">
                <tr>
                  <th className="py-3.5 px-5">Dispute ID</th>
                  <th className="py-3.5 px-5">Buyer</th>
                  <th className="py-3.5 px-5">Seller</th>
                  <th className="py-3.5 px-5">Order ID</th>
                  <th className="py-3.5 px-5">Reason</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {isLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-500">Loading disputes...</td></tr>
                ) : disputes.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-500">No disputes found.</td></tr>
                ) : disputes.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="py-4 px-5 font-mono text-xs text-slate-300 font-bold">{dispute.id.slice(-8).toUpperCase()}</td>
                    <td className="py-4 px-5 font-medium text-white">{dispute.customerName}</td>
                    <td className="py-4 px-5 font-medium text-white">{dispute.sellerName}</td>
                    <td className="py-4 px-5 font-mono text-xs text-blue-400 hover:underline cursor-pointer">{dispute.orderNumber}</td>
                    <td className="py-4 px-5 text-slate-300">{dispute.reason}</td>
                    <td className="py-4 px-5">{getDisputeStatusBadge(dispute.status)}</td>
                    <td className="py-4 px-5 text-slate-400 text-xs">
                      {new Date(dispute.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Review Dispute">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUpdateDisputeStatus(dispute.id, 'Resolved')} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Resolve Dispute">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUpdateDisputeStatus(dispute.id, 'Escalated')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Escalate / Suspend">
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUpdateDisputeStatus(dispute.id, 'Closed')} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors" title="Dismiss">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flagged Products Table */}
      {activeTab === "flagged" && (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900/40 text-slate-400 uppercase text-xs font-semibold border-b border-slate-700/50">
                <tr>
                  <th className="py-3.5 px-5">Product</th>
                  <th className="py-3.5 px-5">Seller</th>
                  <th className="py-3.5 px-5">Reason</th>
                  <th className="py-3.5 px-5">Reported By</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500">Loading flagged products...</td></tr>
                ) : flaggedProducts.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500">No flagged products found.</td></tr>
                ) : flaggedProducts.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="py-4 px-5 font-medium text-white">{report.productName}</td>
                    <td className="py-4 px-5 font-medium text-white">{report.sellerName}</td>
                    <td className="py-4 px-5 text-red-400 font-medium">{report.reason}</td>
                    <td className="py-4 px-5 text-slate-300">{report.reportedBy}</td>
                    <td className="py-4 px-5 text-slate-400 text-xs">
                      {new Date(report.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Review Product">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUpdateFlaggedStatus(report.id, 'Removed')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Remove Product">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUpdateFlaggedStatus(report.id, 'Dismissed')} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Clear Flag">
                          <Shield className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
