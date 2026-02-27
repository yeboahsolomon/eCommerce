"use client";

import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import {
  Loader2, BarChart3, TrendingUp, Calendar,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

export default function AdminAnalyticsPage() {
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [salesByRegion, setSalesByRegion] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [salesRes, statusRes, catRes, regionRes] = await Promise.all([
          api.getAdminSalesChart(period),
          api.getAdminOrdersByStatus(),
          api.getAdminTopCategories(8),
          api.getAdminSalesByRegion(),
        ]);

        if (salesRes.success) setSalesChart(salesRes.data?.chartData || []);
        if (statusRes.success) setOrdersByStatus(statusRes.data || []);
        if (catRes.success) setTopCategories(catRes.data || []);
        if (regionRes.success) setSalesByRegion(regionRes.data || []);
      } catch (err) {
        console.error("Analytics error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [period]);

  // Compute summary metrics from chart data
  const totalRevenue = salesChart.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = salesChart.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const periodLabels: Record<string, string> = { "7d": "7 Days", "30d": "30 Days", "90d": "90 Days" };

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Platform performance insights</p>
        </div>
        <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {["7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium transition ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
          <p className="text-xs text-slate-500 mb-1">Revenue ({periodLabels[period]})</p>
          <p className="text-2xl font-bold text-white">₵{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
          <p className="text-xs text-slate-500 mb-1">Orders ({periodLabels[period]})</p>
          <p className="text-2xl font-bold text-white">{totalOrders.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
          <p className="text-xs text-slate-500 mb-1">Avg Order Value</p>
          <p className="text-2xl font-bold text-white">₵{avgOrderValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Sales Over Time */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5 mb-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          Revenue Over Time
        </h2>
        <div className="h-80">
          {salesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                />
                <YAxis yAxisId="revenue" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} />
                <YAxis yAxisId="orders" orientation="right" stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  formatter={(v: any, name: any) => [
                    name === "revenue" ? `₵${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : v,
                    name === "revenue" ? "Revenue" : "Orders"
                  ]}
                />
                <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="revenue" />
                <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} name="orders" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">No data for this period</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                    outerRadius={85}
                    innerRadius={55}
                    paddingAngle={2}
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
              <div className="h-full flex items-center justify-center text-slate-500">No data</div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {ordersByStatus.map((item, idx) => (
              <div key={item.status} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                {item.status}: {item.count}
              </div>
            ))}
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
          <h2 className="font-semibold text-white mb-4">Top Selling Categories</h2>
          <div className="h-64">
            {topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                    formatter={(v: any) => [`₵${Number(v).toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No data</div>
            )}
          </div>
        </div>
      </div>

      {/* Sales by Region */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
        <h2 className="font-semibold text-white mb-4">Sales by Region</h2>
        <div className="h-72">
          {salesByRegion.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByRegion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="region" stroke="#64748b" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                  formatter={(v: any, name: any) => [
                    name === "revenue" ? `₵${Number(v).toLocaleString()}` : v,
                    name === "revenue" ? "Revenue" : "Orders"
                  ]}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">No region data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
