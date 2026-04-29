"use client";

import { useState } from "react";
import { 
  AlertTriangle, Flag, CheckCircle2, ShieldAlert, 
  XCircle, Clock, Shield, X, Eye
} from "lucide-react";

export interface Dispute {
  id: string;
  disputeId: string;
  buyer: string;
  seller: string;
  orderId: string;
  reason: string;
  status: "Open" | "Under Review" | "Resolved" | "Escalated";
  date: string;
}

export interface FlaggedProduct {
  id: string;
  product: string;
  seller: string;
  reason: string;
  reportedBy: string;
  date: string;
}

const mockDisputes: Dispute[] = [
  { id: "1", disputeId: "DSP-1029", buyer: "Kwame Mensah", seller: "Accra Electronics", orderId: "ORD-9482", reason: "Item not as described", status: "Open", date: "2026-04-29T10:30:00Z" },
  { id: "2", disputeId: "DSP-1028", buyer: "Abena Osei", seller: "Kumasi Kente Hub", orderId: "ORD-9480", reason: "Never received item", status: "Under Review", date: "2026-04-28T14:15:00Z" },
  { id: "3", disputeId: "DSP-1027", buyer: "Kofi Appiah", seller: "Tech Haven", orderId: "ORD-9475", reason: "Defective product", status: "Escalated", date: "2026-04-27T09:45:00Z" },
  { id: "4", disputeId: "DSP-1026", buyer: "Ama Serwaa", seller: "Ghana Fresh Groceries", orderId: "ORD-9470", reason: "Wrong item delivered", status: "Resolved", date: "2026-04-25T16:20:00Z" },
];

const mockFlaggedProducts: FlaggedProduct[] = [
  { id: "1", product: "Fake Apple AirPods Pro", seller: "Tech Haven", reason: "Counterfeit item", reportedBy: "Kofi Appiah", date: "2026-04-29T11:00:00Z" },
  { id: "2", product: "Miracle Weight Loss Tea", seller: "Health Hub", reason: "Misleading claims", reportedBy: "Ama Serwaa", date: "2026-04-28T13:40:00Z" },
  { id: "3", product: "Stolen Samsung S23", seller: "Accra Electronics", reason: "Suspiciously low price", reportedBy: "Yaw Boakye", date: "2026-04-27T10:15:00Z" },
];

export default function DisputesPage() {
  const [activeTab, setActiveTab] = useState<"disputes" | "flagged">("disputes");

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
                {mockDisputes.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="py-4 px-5 font-mono text-xs text-slate-300 font-bold">{dispute.disputeId}</td>
                    <td className="py-4 px-5 font-medium text-white">{dispute.buyer}</td>
                    <td className="py-4 px-5 font-medium text-white">{dispute.seller}</td>
                    <td className="py-4 px-5 font-mono text-xs text-blue-400 hover:underline cursor-pointer">{dispute.orderId}</td>
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
                        <button className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Resolve Dispute">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Escalate / Suspend">
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors" title="Dismiss">
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
                {mockFlaggedProducts.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="py-4 px-5 font-medium text-white">{report.product}</td>
                    <td className="py-4 px-5 font-medium text-white">{report.seller}</td>
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
                        <button className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Remove Product">
                          <X className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Clear Flag">
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
