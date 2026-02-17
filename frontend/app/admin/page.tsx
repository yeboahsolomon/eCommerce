"use client";

import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Loader2, Package, ShoppingCart, Users, DollarSign, 
  TrendingUp, ArrowUpRight, Box, ClipboardList, AlertTriangle
} from "lucide-react";

interface DashboardStats {
  users: { total: number; newToday: number };
  products: { total: number; active: number; lowStock: number };
  orders: { total: number; today: number; pending: number };
  revenue: { thisMonth: number; lastMonth: number; growth: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, ordersRes] = await Promise.all([
          api.getAdminStats(),
          api.getAdminOrders({ limit: 5 }),
        ]);

        if (dashboardRes.success && dashboardRes.data) {
          setStats(dashboardRes.data as unknown as DashboardStats);
        }
        if (ordersRes.success && ordersRes.data?.orders) {
          setRecentOrders(ordersRes.data.orders);
        }
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your store performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-400" />
            </div>
            {stats?.revenue?.growth !== undefined && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${stats.revenue.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <TrendingUp className="h-3 w-3" /> {stats.revenue.growth >= 0 ? '+' : ''}{stats.revenue.growth}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">
            ₵{stats?.revenue?.thisMonth?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </p>
          <p className="text-sm text-slate-400">Monthly Revenue</p>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-green-400" />
            </div>
            {stats?.orders?.pending && stats.orders.pending > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-medium">
                {stats.orders.pending} pending
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{stats?.orders?.total || 0}</p>
          <p className="text-sm text-slate-400">Total Orders</p>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-purple-400" />
            </div>
            {stats?.products?.lowStock && stats.products.lowStock > 0 && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {stats.products.lowStock} low
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{stats?.products?.active || 0}</p>
          <p className="text-sm text-slate-400">Active Products</p>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-400" />
            </div>
            {stats?.users?.newToday && stats.users.newToday > 0 && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">
                +{stats.users.newToday} today
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{stats?.users?.total || 0}</p>
          <p className="text-sm text-slate-400">Total Customers</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="font-semibold text-white">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View All <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left py-3 px-5 text-slate-400 font-medium">Order</th>
                <th className="text-left py-3 px-5 text-slate-400 font-medium">Customer</th>
                <th className="text-left py-3 px-5 text-slate-400 font-medium">Status</th>
                <th className="text-right py-3 px-5 text-slate-400 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition">
                  <td className="py-3 px-5 font-medium text-white">#{order.orderNumber}</td>
                  <td className="py-3 px-5 text-slate-300">{order.customerName || 'N/A'}</td>
                  <td className="py-3 px-5">
                    <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-medium">
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right font-medium text-white">
                    ₵{((order.totalInPesewas || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
