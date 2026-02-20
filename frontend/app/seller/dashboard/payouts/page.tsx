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
  Wallet, 
  ArrowUpRight, 
  History, 
  CreditCard,
  Loader2,
  AlertCircle 
} from "lucide-react";
import { toast } from "sonner";

export default function SellerPayoutsPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [amount, setAmount] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [walletRes, profileRes] = await Promise.all([
        api.getSellerWallet(),
        api.getSellerProfile()
      ]);
      
      if (walletRes.success && walletRes.data) {
        setWallet(walletRes.data.wallet);
        setHistory(walletRes.data.history || []);
      }
      
      if (profileRes.success && profileRes.data) {
        setSellerProfile(profileRes.data.profile);
      }
    } catch (error) {
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) < 50) {
      toast.error("Minimum payout amount is GHS 50.00");
      return;
    }

    if (Number(amount) > (wallet?.currentBalance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setRequesting(true);
    try {
      // Ensure we use the provider from their profile
      const provider = sellerProfile?.mobileMoneyProvider || "MOMO";
      const res = await api.requestPayout(Number(amount), provider);
      if (res.success) {
        toast.success("Payout request submitted successfully");
        setAmount("");
        fetchData(); // Refresh data
      } else {
        toast.error(res.message || "Failed to request payout");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payouts & Wallet</h1>
        <p className="text-slate-500">Manage your earnings and withdrawals</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Balance Card */}
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               
               <div className="relative z-10">
                  <p className="text-blue-100 font-medium mb-1 flex items-center gap-2">
                     <Wallet className="w-4 h-4" /> Available Balance
                  </p>
                  <h2 className="text-4xl font-bold mb-6">{formatCurrency(wallet?.currentBalance || 0)}</h2>

                  <div className="grid grid-cols-2 gap-8 border-t border-white/20 pt-6">
                     <div>
                        <p className="text-blue-200 text-sm mb-1">Pending Clearance</p>
                        <p className="text-xl font-bold">{formatCurrency(wallet?.pendingBalance || 0)}</p>
                     </div>
                     <div>
                        <p className="text-blue-200 text-sm mb-1">Total Withdrawn</p>
                        <p className="text-xl font-bold">{formatCurrency(wallet?.totalWithdrawn || 0)}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Payout History */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                     <History className="w-5 h-5 text-slate-500" /> Transaction History
                  </h3>
               </div>
               <div className="divide-y divide-slate-100">
                  {history.length === 0 ? (
                     <div className="p-8 text-center text-slate-500">No transactions yet</div>
                  ) : (
                     history.map((tx, i) => (
                        <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                 tx.type === 'PAYOUT' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                              }`}>
                                 {tx.type === 'PAYOUT' ? <ArrowUpRight className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                              </div>
                              <div>
                                 <p className="font-bold text-slate-900">{tx.description || tx.type}</p>
                                 <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className={`font-bold ${tx.type === 'PAYOUT' ? 'text-slate-900' : 'text-green-600'}`}>
                                 {tx.type === 'PAYOUT' ? '-' : '+'}{formatCurrency(tx.amount)}
                              </p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                                 tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                 {tx.status}
                              </span>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>

         {/* Request Payout Form */}
         <div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm sticky top-6">
               <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" /> Request Payout
               </h3>
               
               <form onSubmit={handleRequestPayout} className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Amount (GHS)</label>
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₵</span>
                        <input 
                           type="number" 
                           value={amount}
                           onChange={(e) => setAmount(e.target.value)}
                           className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                           placeholder="0.00"
                           min="50"
                        />
                     </div>
                     <p className="text-xs text-slate-500 mt-1">Minimum withdrawal: GHS 50.00</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-3 items-center">
                     <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-slate-900 text-[10px] shrink-0">
                        {sellerProfile?.mobileMoneyProvider || "MOMO"}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{sellerProfile?.mobileMoneyProvider} MobileMoney</p>
                        <p className="text-xs text-slate-500 truncate">{sellerProfile?.mobileMoneyNumber || "Not configured"}</p>
                     </div>
                  </div>

                  <div className="pt-2">
                     <button 
                        type="submit" 
                        disabled={requesting || !amount || Number(amount) < 50}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Withdrawal"}
                     </button>
                  </div>

                  <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                     <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                     <p>Payouts are processed within 24 hours on business days.</p>
                  </div>
               </form>
            </div>
         </div>
      </div>
    </div>
  );
}
