"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingBag, Package, Star, Loader2 } from "lucide-react";
import Link from "next/link";
import { StatsCard } from "./components/StatsCard";
import dynamic from "next/dynamic";
const SalesChart = dynamic(() => import("./components/SalesChart").then(mod => ({ default: mod.SalesChart })), { ssr: false });
import { RecentOrders } from "./components/RecentOrders";

const formatCurrency = (amountInPesewas: number) => {
  return typeof amountInPesewas === 'number' 
    ? `₵${(amountInPesewas / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₵0.00`;
};

export default function SellerDashboardPage() {
  const [chartFilter, setChartFilter] = useState("7D");
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-dashboard-stats'],
    queryFn: async () => {
      const res = await api.getSellerStats();
      if (!res.success) throw new Error(res.message);
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalSales: 0,
    salesGrowth: 0,
    totalOrders: 0,
    ordersGrowth: 0,
    activeProducts: 0,
    productsGrowth: 0,
    rating: 0,
    ratingCount: 0
  };

  const dbChartData = data?.salesChart || [
     { name: 'Mon', sales: 0 },
     { name: 'Tue', sales: 0 },
     { name: 'Wed', sales: 0 },
     { name: 'Thu', sales: 0 },
     { name: 'Fri', sales: 0 },
     { name: 'Sat', sales: 0 },
     { name: 'Sun', sales: 0 },
  ];
  
  // Note: True filtering would require backend support or date-rich records.
  // Passing chartFilter to let components react if extended later.
  const chartData = dbChartData; 

  const recentOrders = data?.recentOrders || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
            <p className="text-slate-500">Welcome back! Here's what's happening today.</p>
         </div>
         <div className="flex gap-3">
             <Link href="/seller/dashboard/products/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
                <Package className="w-4 h-4" /> Add Product
             </Link>
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatsCard 
            title="Total Sales" 
            value={formatCurrency(stats.totalSales)} 
            icon={DollarSign}
            trend={stats.salesGrowth}
            color="blue"
         />
         <StatsCard 
            title="Total Orders" 
            value={stats.totalOrders.toString()} 
            icon={ShoppingBag}
            trend={stats.ordersGrowth}
            color="purple"
         />
         <StatsCard 
            title="Active Products" 
            value={stats.activeProducts.toString()} 
            icon={Package}
            trend={stats.productsGrowth}
            color="orange"
         />
         <StatsCard 
            title="Rating" 
            value={stats.rating.toFixed(1)} 
            icon={Star}
            subtext={`(${stats.ratingCount} reviews)`}
            color="yellow"
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <SalesChart chartData={chartData} onFilterChange={setChartFilter} />
         <RecentOrders orders={recentOrders} />
      </div>
    </div>
  );
}
