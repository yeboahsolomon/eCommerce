"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Package, 
  Star,
  ChevronRight,
  MoreVertical
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface DashboardData {
  stats: {
    totalSales: number;
    salesGrowth: number;
    totalOrders: number;
    ordersGrowth: number;
    activeProducts: number;
    productsGrowth: number;
    rating: number;
    ratingCount: number;
  };
  recentOrders: any[];
  salesChart: { name: string; sales: number }[];
}

export default function SellerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getSellerStats();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Fallback data if API returns empty/null (for development/preview)
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

  const chartData = data?.salesChart || [
     { name: 'Mon', sales: 0 },
     { name: 'Tue', sales: 0 },
     { name: 'Wed', sales: 0 },
     { name: 'Thu', sales: 0 },
     { name: 'Fri', sales: 0 },
     { name: 'Sat', sales: 0 },
     { name: 'Sun', sales: 0 },
  ];

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
         {/* Sales Chart */}
         <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-slate-900">Sales Overview</h3>
               <select className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1 text-slate-600 focus:ring-0 cursor-pointer">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>This Year</option>
               </select>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <defs>
                       <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `GH₵${val}`} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                       formatter={(value: any) => [formatCurrency(value), 'Sales']}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                 </AreaChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Recent Orders */}
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-slate-900">Recent Orders</h3>
               <Link href="/seller/dashboard/orders" className="text-sm text-blue-600 font-medium hover:underline">View All</Link>
            </div>

            <div className="space-y-4">
               {data?.recentOrders && data.recentOrders.length > 0 ? (
                  data.recentOrders.map((order: any) => (
                     <div key={order.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">
                           {order.user?.firstName?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-slate-900 truncate">Order #{order.orderNumber}</p>
                           <p className="text-xs text-slate-500 truncate">{order.items?.length} items • {new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                           <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-600'
                           }`}>
                              {order.status}
                           </span>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="text-center py-10">
                     <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ShoppingBag className="w-6 h-6 text-slate-300" />
                     </div>
                     <p className="text-sm text-slate-500">No orders yet</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, trend, color, subtext }: any) {
   const isPositive = trend >= 0;
   
   const colorStyles = {
      blue: "bg-blue-50 text-blue-600",
      purple: "bg-purple-50 text-purple-600",
      orange: "bg-orange-50 text-orange-600",
      yellow: "bg-yellow-50 text-yellow-600",
   }[color as string] || "bg-slate-50 text-slate-600";

   return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
         <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorStyles}`}>
               <Icon className="w-6 h-6" />
            </div>
            {trend !== undefined && (
               <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(trend)}%
               </div>
            )}
         </div>
         <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
         <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtext && <span className="text-xs text-slate-400">{subtext}</span>}
         </div>
      </div>
   );
}
