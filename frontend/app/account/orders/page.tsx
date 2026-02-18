"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Package, Loader2, ShoppingBag } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalInPesewas: number;
  itemCount: number;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const tabs = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'COMPLETED', label: 'Completed' },
  ] as const;

  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        let statusParam = undefined;
        if (activeTab === 'PENDING') {
          statusParam = 'PENDING,PAYMENT_PENDING,CONFIRMED,PROCESSING,SHIPPED,OUT_FOR_DELIVERY';
        } else if (activeTab === 'COMPLETED') {
          statusParam = 'DELIVERED,CANCELLED';
        }

        const res = await api.getOrders({ status: statusParam });
        if (res.success && res.data?.orders) {
          setOrders(res.data.orders as unknown as Order[]);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, activeTab]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">Please login to view your orders</p>
        <Link href="/auth/login" className="text-blue-600 font-medium hover:underline">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 gap-2 mb-6">
        <Link href="/account" className="hover:text-blue-600">Account</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">Orders</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6 overflow-x-auto">
        <div className="flex gap-6 min-w-max">
           {tabs.map((tab) => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
             >
                {tab.label}
             </button>
           ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <ShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-slate-900 mb-2">No orders found</h2>
          <p className="text-slate-500 mb-6">There are no orders in this category</p>
          <Link href="/products" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Order #{order.orderNumber}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })} • {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-slate-100 text-slate-600"}`}>
                      {order.status}
                    </span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      ₵{(order.totalInPesewas / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
