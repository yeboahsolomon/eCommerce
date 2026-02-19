"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { 
  Search, 
  Filter, 
  Eye, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getSellerOrders({ 
         status: statusFilter !== 'ALL' ? statusFilter : undefined 
      });
      if (res.success && res.data) {
        setOrders(res.data.orders);
      }
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const toggleExpand = (id: string) => {
    setExpandedOrder(expandedOrder === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'PROCESSING': return 'bg-blue-100 text-blue-700';
      case 'SHIPPED': return 'bg-purple-100 text-purple-700';
      case 'DELIVERED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
     // This would typically confirm with user and then call API
     // Since specific seller update endpoint isn't in api.ts yet (only admin), 
     // we might need to add it or use admin one if seller has permission.
     // For now, assume a placeholder action.
     toast.info("Status update feature coming soon");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500">Manage and fulfill customer orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 overflow-x-auto">
         {['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
            <button
               key={status}
               onClick={() => setStatusFilter(status)}
               className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                  statusFilter === status 
                     ? 'bg-blue-600 text-white' 
                     : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
               }`}
            >
               {status === 'ALL' ? 'All Orders' : status}
            </button>
         ))}
      </div>

      <div className="space-y-4">
         {loading ? (
            <div className="py-12 text-center">
               <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            </div>
         ) : orders.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-100 text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-300" />
               </div>
               <h3 className="text-lg font-bold text-slate-900 mb-2">No orders found</h3>
               <p className="text-slate-500">Orders will appear here once customers make a purchase.</p>
            </div>
         ) : (
            orders.map((order) => (
               <div key={order.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition">
                  <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-lg">
                           #{order.orderNumber.slice(-4)}
                        </div>
                        <div>
                           <p className="font-bold text-slate-900">Order #{order.orderNumber}</p>
                           <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()} • {order.items.length} items</p>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-6 ml-16 md:ml-0 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                           <p className="text-sm text-slate-500 mb-1">Total Amount</p>
                           <p className="font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                        </div>
                        
                        <div>
                           <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                              {order.status}
                           </span>
                        </div>

                        <div className="text-slate-400">
                           {expandedOrder === order.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                     </div>
                  </div>

                  {expandedOrder === order.id && (
                     <div className="border-t border-slate-100 bg-slate-50 p-6 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div>
                              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                 <Package className="w-4 h-4 text-slate-500" /> Order Items
                              </h4>
                              <div className="space-y-3">
                                 {order.items.map((item: any) => (
                                    <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                       <div className="w-12 h-12 bg-slate-100 rounded-md overflow-hidden shrink-0">
                                          {item.product?.images?.[0] && (
                                             <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                          )}
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <p className="font-medium text-slate-900 truncate">{item.product?.name}</p>
                                          <p className="text-xs text-slate-500">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                                       </div>
                                       <p className="font-bold text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           <div className="space-y-6">
                              <div>
                                 <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-slate-500" /> Shipping Details
                                 </h4>
                                 <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm space-y-2">
                                    <p><span className="text-slate-500">Customer:</span> <span className="font-medium">{order.address?.fullName}</span></p>
                                    <p><span className="text-slate-500">Phone:</span> <span className="font-medium">{order.address?.phone}</span></p>
                                    <p><span className="text-slate-500">Address:</span> <span className="font-medium">{order.address?.streetAddress}, {order.address?.city}</span></p>
                                    <p><span className="text-slate-500">Region:</span> <span className="font-medium">{order.address?.region}</span></p>
                                 </div>
                              </div>

                              <div>
                                 <h4 className="font-bold text-slate-900 mb-4">Actions</h4>
                                 <div className="flex flex-wrap gap-2">
                                    {order.status === 'PENDING' && (
                                       <button onClick={() => updateStatus(order.id, 'PROCESSING')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                                          Mark as Processing
                                       </button>
                                    )}
                                    {order.status === 'PROCESSING' && (
                                       <button onClick={() => updateStatus(order.id, 'SHIPPED')} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition">
                                          Mark as Shipped
                                       </button>
                                    )}
                                    <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition">
                                       Print Invoice
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            ))
         )}
      </div>
    </div>
  );
}
import { ShoppingBag } from "lucide-react";
