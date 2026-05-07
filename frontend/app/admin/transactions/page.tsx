"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  CreditCard, Search, Filter, Download, 
  CheckCircle2, Clock, XCircle, Wallet, ArrowUpRight, TrendingUp, AlertTriangle
} from "lucide-react";

export interface Transaction {
  id: string;
  referenceId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  method: "Paystack" | "MTN MoMo" | "Telecel Cash" | "AirtelTigo";
  status: "Success" | "Pending" | "Failed";
  date: string;
}

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [txnRes, summaryRes] = await Promise.all([
          api.getAdminTransactions({ status: statusFilter, method: methodFilter, search: searchTerm }),
          api.getAdminTransactionsSummary()
        ]);
        if (txnRes.success) setTransactions(txnRes.data);
        if (summaryRes.success) setSummary(summaryRes.data);
      } catch (err) {
        console.error("Failed to load transactions", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Simple debounce for search
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, methodFilter]);

  const handleExportCSV = () => {
    // Basic CSV Export logic
    const headers = ["Reference ID", "Customer", "Phone", "Amount (GHS)", "Method", "Status", "Date"];
    const csvContent = [
      headers.join(","),
      ...transactions.map(t => 
        `"${t.referenceId}","${t.customerName}","${t.customerPhone}",${t.amount},"${t.method}","${t.status}","${new Date(t.date).toLocaleString()}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_export_${new Date().getTime()}.csv`;
    link.click();
  };

  const filteredTransactions = transactions; // API already filters

  const getStatusBadge = (status: Transaction["status"]) => {
    switch(status) {
      case "Success": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30 uppercase"><CheckCircle2 className="w-3 h-3" /> Success</span>;
      case "Pending": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 uppercase"><Clock className="w-3 h-3" /> Pending</span>;
      case "Failed": return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 uppercase"><XCircle className="w-3 h-3" /> Failed</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions & Payments</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor platform payments, settlements, and success rates.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Paid Out", value: `₵ ${(summary?.totalPaidOutInPesewas / 100 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Wallet, color: "bg-green-500/15 text-green-400", trend: "" },
          { label: "Pending Settlements", value: `₵ ${(summary?.pendingSettlementsInPesewas / 100 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Clock, color: "bg-yellow-500/15 text-yellow-400", trend: "Active" },
          { label: "Failed Transactions", value: summary?.failedTransactions || 0, icon: AlertTriangle, color: "bg-red-500/15 text-red-400", trend: "" },
          { label: "Success Rate", value: `${summary?.successRate || 0}%`, icon: TrendingUp, color: "bg-blue-500/15 text-blue-400", trend: "" },
        ].map((card, i) => (
          <div key={i} className="bg-slate-800 rounded-xl border border-slate-700/50 p-5 shadow-sm hover:border-slate-500 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className={`h-10 w-10 ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-900/50 px-2 py-1 rounded-md">{card.trend}</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{card.value}</p>
            <p className="text-sm text-slate-400 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters & Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-700/50 flex flex-col sm:flex-row items-center gap-4 justify-between bg-slate-800/50">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name or Ref ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-sm text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 flex-1 sm:flex-none"
            >
              <option value="All">All Methods</option>
              <option value="Paystack">Paystack</option>
              <option value="MTN MoMo">MTN MoMo</option>
              <option value="Telecel Cash">Telecel Cash</option>
              <option value="AirtelTigo">AirtelTigo</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-sm text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 flex-1 sm:flex-none"
            >
              <option value="All">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/40 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="py-3.5 px-5">Reference ID</th>
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5 text-right">Amount</th>
                <th className="py-3.5 px-5">Method</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-xs text-slate-300">{txn.referenceId}</td>
                  <td className="py-3.5 px-5">
                    <p className="font-medium text-white">{txn.customerName}</p>
                    <p className="text-xs text-slate-500">{txn.customerPhone}</p>
                  </td>
                  <td className="py-3.5 px-5 text-right font-bold text-white">
                    ₵{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-5 text-slate-300 font-medium">{txn.method}</td>
                  <td className="py-3.5 px-5">{getStatusBadge(txn.status)}</td>
                  <td className="py-3.5 px-5 text-slate-400 text-xs">
                    {new Date(txn.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button className="text-blue-400 hover:text-blue-300 text-xs font-medium px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors">
                      View Details
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p>No transactions found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
