"use client";

import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Package, ShoppingCart, Users, DollarSign,
  TrendingUp, TrendingDown, ArrowUpRight, ClipboardList,
  FileText, ShoppingBag, Eye
} from "lucide-react";
import dynamic from "next/dynamic";

const RevenueLineChart = dynamic(() => import("@/components/admin/charts/RevenueLineChart"), { ssr: false });
const OrderStatusPieChart = dynamic(() => import("@/components/admin/charts/OrderStatusPieChart"), { ssr: false });
const TopCategoriesBarChart = dynamic(() => import("@/components/admin/charts/TopCategoriesBarChart"), { ssr: false });

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  REVIEWING: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  APPROVED: "bg-green-500/20 text-green-400 border border-green-500/30",
  REJECTED: "bg-red-500/20 text-red-400 border border-red-500/30",
  INFO_REQUESTED: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
  PROCESSING: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  SHIPPED: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  DELIVERED: "bg-green-500/20 text-green-400 border border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border border-red-500/30",
};

export interface StatCardData {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  trendText: string | null;
  trendPositive: boolean;
  link: string;
}

export interface MockOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalInCedis: number;
}

const mockRecentOrders: MockOrder[] = [
  { id: "1", orderNumber: "ORD-9482", customerName: "Kwame Mensah", status: "PENDING", totalInCedis: 450.50 },
  { id: "2", orderNumber: "ORD-9481", customerName: "Abena Osei", status: "PROCESSING", totalInCedis: 1250.00 },
  { id: "3", orderNumber: "ORD-9480", customerName: "Kofi Appiah", status: "SHIPPED", totalInCedis: 85.00 },
  { id: "4", orderNumber: "ORD-9479", customerName: "Ama Serwaa", status: "DELIVERED", totalInCedis: 3200.75 },
  { id: "5", orderNumber: "ORD-9478", customerName: "Yaw Boakye", status: "CANCELLED", totalInCedis: 120.00 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, catRes] = await Promise.all([
          api.getAdminDashboard(),
          api.getAdminTopCategories(6),
        ]);

        if (dashboardRes.success) setStats(dashboardRes.data);
        if (catRes.success) setTopCategories(catRes.data || []);
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

  const statCards: StatCardData[] = [
    {
      label: "Monthly Revenue",
      value: `₵${stats?.revenue?.thisMonth?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "45,230.50"}`,
      icon: DollarSign,
      color: "green",
      trendText: "+12.5% vs last month",
      trendPositive: true,
      link: "/admin/analytics",
    },
    {
      label: "Total Orders",
      value: stats?.orders?.total || 1240,
      icon: ShoppingCart,
      color: "blue",
      trendText: "+5.2% vs last month",
      trendPositive: true,
      link: "/admin/orders",
    },
    {
      label: "Active Sellers",
      value: stats?.sellers?.total || 142,
      icon: ShoppingBag,
      color: "purple",
      trendText: "+18.0% vs last month",
      trendPositive: true,
      link: "/admin/sellers",
    },
    {
      label: "Active Products",
      value: stats?.products?.active || 4850,
      icon: Package,
      color: "amber",
      trendText: "-2.4% vs last month",
      trendPositive: false,
      link: "/admin/products",
    },
    {
      label: "Total Users",
      value: stats?.users?.total || 15420,
      icon: Users,
      color: "indigo",
      trendText: "+24.8% vs last month",
      trendPositive: true,
      link: "/admin/users",
    },
    {
      label: "Pending Applications",
      value: stats?.sellers?.pendingApplications || 12,
      icon: FileText,
      color: "red",
      trendText: "-8.5% vs last month",
      trendPositive: false,
      link: "/admin/applications",
    },
  ];

  const colorMap: Record<string, string> = {
    green: "bg-green-500/15 text-green-400",
    blue: "bg-blue-500/15 text-blue-400",
    purple: "bg-purple-500/15 text-purple-400",
    amber: "bg-amber-500/15 text-amber-400",
    indigo: "bg-indigo-500/15 text-indigo-400",
    red: "bg-red-500/15 text-red-400",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1 text-sm">Overview of your platform performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {statCards.map((card) => (
          <Link 
            key={card.label} 
            href={card.link}
            className="group block bg-slate-800 rounded-xl border border-slate-700/50 p-4 hover:border-slate-500 hover:scale-105 hover:shadow-xl hover:shadow-black/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 ${colorMap[card.color]} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{card.value}</p>
            <p className="text-sm text-slate-400 font-medium">{card.label}</p>
            
            {card.trendText && (
              <div className="flex items-center mt-3 pt-3 border-t border-slate-700/50">
                {card.trendPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-400 mr-1.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-400 mr-1.5" />
                )}
                <span className={`text-[11px] font-medium ${card.trendPositive ? "text-green-400" : "text-red-400"}`}>
                  {card.trendText}
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700/50 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-semibold text-white">Sales Over Time</h2>
              <p className="text-xs text-slate-400 mt-0.5">Revenue generated in GHS</p>
            </div>
          </div>
          <div className="h-72">
            <RevenueLineChart />
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5 shadow-sm">
          <div className="mb-2">
            <h2 className="font-semibold text-white">Orders by Status</h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribution of all active orders</p>
          </div>
          <div className="h-72">
            <OrderStatusPieChart />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Categories */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5 shadow-sm">
          <h2 className="font-semibold text-white mb-4">Top Selling Categories</h2>
          <div className="h-56">
            {topCategories.length > 0 ? (
              <TopCategoriesBarChart data={topCategories} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No category data</div>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <h2 className="font-semibold text-white">Pending Applications</h2>
            <Link href="/admin/applications" className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {stats?.recentApplications?.length > 0 ? (
            <div className="divide-y divide-slate-700/50">
              {stats.recentApplications.slice(0, 5).map((app: any) => (
                <Link
                  key={app.id}
                  href={`/admin/applications/${app.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{app.storeName}</p>
                    <p className="text-xs text-slate-500">{app.applicantName} · {app.ghanaRegion}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${STATUS_COLORS[app.status] || "bg-slate-700 text-slate-400"}`}>
                      {app.status}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1.5">
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
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden shadow-sm mb-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <h2 className="font-semibold text-white">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
            View All <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/40 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="py-3.5 px-5">Order ID</th>
                <th className="py-3.5 px-5">Customer Name</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Total Amount</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {mockRecentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-700/20 transition-colors group">
                  <td className="py-3.5 px-5 font-medium text-white whitespace-nowrap">
                    {order.orderNumber}
                  </td>
                  <td className="py-3.5 px-5 text-slate-300 font-medium">
                    {order.customerName}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide ${ORDER_STATUS_COLORS[order.status] || "bg-slate-700 text-slate-300"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-bold text-white whitespace-nowrap">
                    ₵{order.totalInCedis.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
