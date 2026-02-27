"use client";

import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, ArrowLeft, ShoppingBag, Package, ClipboardList,
  DollarSign, Star, MapPin, Mail, Phone, Calendar,
  Ban, CheckCircle, Edit3, Save,
} from "lucide-react";
import { toast } from "sonner";

export default function SellerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [seller, setSeller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "orders">("overview");
  const [editingCommission, setEditingCommission] = useState(false);
  const [commissionRate, setCommissionRate] = useState(5);
  const [savingCommission, setSavingCommission] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchSeller = async () => {
      try {
        const res = await api.getAdminSeller(id as string);
        if (res.success && res.data?.seller) {
          setSeller(res.data.seller);
          setCommissionRate(res.data.seller.commissionRate || 5);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSeller();
  }, [id]);

  const handleSuspend = async () => {
    if (!confirm("Suspend this seller?")) return;
    setActionLoading(true);
    try {
      const res = await api.suspendSeller(id as string);
      if (res.success) {
        toast.success("Seller suspended");
        setSeller({ ...seller, isActive: false });
      } else toast.error(res.message || "Failed");
    } catch { toast.error("Error suspending seller"); }
    finally { setActionLoading(false); }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      const res = await api.activateSeller(id as string);
      if (res.success) {
        toast.success("Seller activated");
        setSeller({ ...seller, isActive: true });
      } else toast.error(res.message || "Failed");
    } catch { toast.error("Error activating seller"); }
    finally { setActionLoading(false); }
  };

  const saveCommission = async () => {
    setSavingCommission(true);
    try {
      const res = await api.updateSellerCommission(id as string, commissionRate);
      if (res.success) {
        toast.success(`Commission updated to ${commissionRate}%`);
        setEditingCommission(false);
        setSeller({ ...seller, commissionRate });
      } else toast.error(res.message || "Failed");
    } catch { toast.error("Error updating commission"); }
    finally { setSavingCommission(false); }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  if (!seller) {
    return (
      <div className="text-center py-20">
        <ShoppingBag className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Seller not found</p>
        <Link href="/admin/sellers" className="text-blue-400 text-sm mt-2 inline-block hover:underline">← Back to sellers</Link>
      </div>
    );
  }

  const stats = [
    { label: "Total Sales", value: `₵${(seller.totalSalesInCedis || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "blue" },
    { label: "Products", value: seller._count?.products || 0, icon: Package, color: "purple" },
    { label: "Orders", value: seller._count?.sellerOrders || 0, icon: ClipboardList, color: "green" },
    { label: "Rating", value: seller.averageRating ? `${seller.averageRating.toFixed(1)} / 5` : "No ratings", icon: Star, color: "yellow" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/15 text-blue-400",
    purple: "bg-purple-500/15 text-purple-400",
    green: "bg-green-500/15 text-green-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
  };

  return (
    <div>
      {/* Header */}
      <Link href="/admin/sellers" className="text-slate-400 hover:text-white text-xs flex items-center gap-1 mb-4 transition">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Sellers
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{seller.businessName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded border ${
              seller.isActive ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"
            }`}>
              {seller.isActive ? "ACTIVE" : "SUSPENDED"}
            </span>
            {seller.isVerified && (
              <span className="text-[10px] text-blue-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Verified</span>
            )}
          </div>
        </div>
        <div>
          {seller.isActive ? (
            <button onClick={handleSuspend} disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Suspend
            </button>
          ) : (
            <button onClick={handleActivate} disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
            <div className={`h-8 w-8 ${colorMap[s.color]} rounded-lg flex items-center justify-center mb-2`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seller Info */}
        <div className="space-y-5">
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Seller Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4" />
                <span>{seller.businessEmail || seller.user?.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-4 w-4" />
                <span>{seller.businessPhone || seller.user?.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span>{seller.ghanaRegion || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <span>Joined {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString("en-GB") : "—"}</span>
              </div>
            </div>
          </div>

          {/* Commission Rate */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Commission Rate</h2>
            {editingCommission ? (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} max={50} step={0.5}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                />
                <span className="text-slate-400">%</span>
                <button onClick={saveCommission} disabled={savingCommission}
                  className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition disabled:opacity-50">
                  {savingCommission ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <button onClick={() => { setEditingCommission(false); setCommissionRate(seller.commissionRate || 5); }}
                  className="p-1.5 text-slate-400 hover:bg-slate-700 rounded transition text-xs">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{seller.commissionRate || 5}%</span>
                <button onClick={() => setEditingCommission(true)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition">
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Wallet */}
          {seller.wallet && (
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Wallet</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Balance</span>
                  <span className="text-white font-medium">₵{((seller.wallet.currentBalance || 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pending</span>
                  <span className="text-yellow-400">₵{((seller.wallet.pendingBalance || 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2">
                  <span className="text-slate-400">Total Earned</span>
                  <span className="text-green-400">₵{((seller.wallet.totalEarned || 0) / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="font-semibold text-white">Recent Orders</h2>
          </div>
          {seller.recentOrders?.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium text-xs">Order</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium text-xs">Customer</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium text-xs">Status</th>
                  <th className="text-right py-2.5 px-4 text-slate-500 font-medium text-xs">Total</th>
                </tr>
              </thead>
              <tbody>
                {seller.recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-t border-slate-700/30">
                    <td className="py-2.5 px-4 text-white text-xs font-medium">#{order.orderNumber}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-xs">{order.customerName || "—"}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-medium">{order.status}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-white text-xs">₵{order.totalInCedis?.toFixed(2) || "0.00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-slate-500 text-sm">No orders yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
