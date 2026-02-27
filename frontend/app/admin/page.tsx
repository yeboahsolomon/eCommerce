"use client";

import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Package, ShoppingCart, Users, DollarSign,
  TrendingUp, ArrowUpRight, ClipboardList, AlertTriangle,
  FileText, ShoppingBag, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  REVIEWING: "bg-blue-500/20 text-blue-400",
  APPROVED: "bg-green-500/20 text-green-400",
  REJECTED: "bg-red-500/20 text-red-400",
  INFO_REQUESTED: "bg-orange-500/20 text-orange-400",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, salesRes, statusRes, catRes, ordersRes] = await Promise.all([
          api.getAdminDashboard(),
          api.getAdminSalesChart("30d"),
          api.getAdminOrdersByStatus(),
          api.getAdminTopCategories(6),
          api.getAdminOrders({ limit: 5 }),
        ]);

        if (dashboardRes.success) setStats(dashboardRes.data);
        if (salesRes.success) setSalesChart(salesRes.data?.chartData || []);
        if (statusRes.success) setOrdersByStatus(salesRes.data ? statusRes.data : []);
        if (catRes.success) setTopCategories(catRes.data || []);
        if (ordersRes.success) setRecentOrders(ordersRes.data?.orders || []);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Monthly Revenue",
      value: `₵${stats?.revenue?.thisMonth?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}`,
      icon: DollarSign,
      color: "blue",
      badge: stats?.revenue?.growth !== undefined ? `${stats.revenue.growth >= 0 ? "+" : ""}${stats.revenue.growth}%` : null,
      badgePositive: (stats?.revenue?.growth || 0) >= 0,
    },
    {
      label: "Total Orders",
      value: stats?.orders?.total || 0,
      icon: ShoppingCart,
      color: "green",
      badge: stats?.orders?.pending ? `${stats.orders.pending} pending` : null,
      badgePositive: false,
      link: "/admin/orders",
    },
    {
      label: "Active Sellers",
      value: stats?.sellers?.total || 0,
      icon: ShoppingBag,
      color: "purple",
      badge: stats?.sellers?.pendingApplications ? `${stats.sellers.pendingApplications} pending` : null,
      badgePositive: false,
      link: "/admin/sellers",
    },
    {
      label: "Active Products",
      value: stats?.products?.active || 0,
      icon: Package,
      color: "indigo",
      badge: stats?.products?.lowStock ? `${stats.products.lowStock} low stock` : null,
      badgePositive: false,
      link: "/admin/products",
    },
    {
      label: "Total Users",
      value: stats?.users?.total || 0,
      icon: Users,
      color: "orange",
      badge: stats?.users?.newToday ? `+${stats.users.newToday} today` : null,
      badgePositive: true,
      link: "/admin/users",
    },
    {
      label: "Pending Applications",
      value: stats?.sellers?.pendingApplications || 0,
      icon: FileText,
      color: "rose",
      badge: null,
      badgePositive: false,
      link: "/admin/applications",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/15 text-blue-400",
    green: "bg-green-500/15 text-green-400",
    purple: "bg-purple-500/15 text-purple-400",
    indigo: "bg-indigo-500/15 text-indigo-400",
    orange: "bg-orange-500/15 text-orange-400",
    rose: "bg-rose-500/15 text-rose-400",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1 text-sm">Overview of your platform performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-slate-800 rounded-xl border border-slate-700/50 p-4 hover:border-slate-600 transition">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-9 w-9 ${colorMap[card.color]} rounded-lg flex items-center justify-center`}>
                <card.icon className="h-4 w-4" />
              </div>
              {card.badge && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  card.badgePositive ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
                }`}>
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700/50 p-5">
          <h2 className="font-semibold text-white mb-4">Sales Over Time (30 days)</h2>
          <div className="h-64">
            {salesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    formatter={(v: any) => [`₵${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Revenue"]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <BarChart3 className="h-8 w-8 mr-2 opacity-50" />
                No sales data yet
              </div>
            )}
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
          <h2 className="font-semibold text-white mb-4">Orders by Status</h2>
          <div className="h-64">
            {ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ name, value }: any) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {ordersByStatus.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No order data</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Categories */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
          <h2 className="font-semibold text-white mb-4">Top Selling Categories</h2>
          <div className="h-56">
            {topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                    formatter={(v: any) => [`₵${Number(v).toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No category data</div>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <h2 className="font-semibold text-white">Pending Applications</h2>
            <Link href="/admin/applications" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {stats?.recentApplications?.length > 0 ? (
            <div className="divide-y divide-slate-700/50">
              {stats.recentApplications.map((app: any) => (
                <Link
                  key={app.id}
                  href={`/admin/applications/${app.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-700/30 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{app.storeName}</p>
                    <p className="text-xs text-slate-500">{app.applicantName} · {app.ghanaRegion}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded ${STATUS_COLORS[app.status] || "bg-slate-700 text-slate-400"}`}>
                      {app.status}
                    </span>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {new Date(app.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No pending applications</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="font-semibold text-white">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View All <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
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
                {recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-t border-slate-700/30 hover:bg-slate-700/20 transition">
                    <td className="py-2.5 px-4 font-medium text-white text-xs">#{order.orderNumber}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-xs">{order.customerName || "N/A"}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-medium">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-white text-xs">
                      ₵{(order.totalInCedis || (order.totalInPesewas || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
