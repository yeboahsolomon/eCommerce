"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Order } from "@/types";

interface RecentOrdersProps {
  orders: Order[];
}

const formatCurrency = (amountInPesewas: number) => {
  return typeof amountInPesewas === 'number' 
    ? `₵${(amountInPesewas / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₵0.00`;
};

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900">Recent Orders</h3>
          <Link href="/seller/dashboard/orders" className="text-sm text-blue-600 font-medium hover:underline">View All</Link>
      </div>

      <div className="space-y-4">
          {orders && orders.length > 0 ? (
            orders.slice(0, 5).map((order: any) => (
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
  );
}
