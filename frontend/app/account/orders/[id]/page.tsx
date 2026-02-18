"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Loader2, Package, MapPin, CreditCard, ArrowLeft, Download, XCircle, Clock, CheckCircle2, Truck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  priceInPesewas: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalInPesewas: number;
  subtotalInPesewas: number;
  deliveryFeeInPesewas: number;
  shippingFullName: string;
  shippingPhone: string;
  shippingCity: string;
  shippingRegion: string;
  shippingStreetAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  items: OrderItem[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const timelineSteps = [
  { id: 'PENDING', label: 'Order Placed', icon: Clock },
  { id: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { id: 'PROCESSING', label: 'Processing', icon: Package },
  { id: 'SHIPPED', label: 'Shipped', icon: Truck },
  { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();

  const fetchOrder = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getOrder(params.id);
      if (res.success && res.data?.order) {
        setOrder(res.data.order as unknown as OrderDetail);
      }
    } catch (err) {
      console.error("Failed to fetch order:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchOrder();
    }
  }, [isAuthenticated, authLoading, params.id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm("Are you sure you want to cancel this order?")) return;

    setIsCancelling(true);
    try {
      // Assuming api.cancelOrder exists or updateOrderStatus
      // Wait, api.ts doesn't have cancelOrder for user?
      // Step 296 has updateOrderStatus for admin. 
      // User cancellation usually implies updating status to CANCELLED if allowed.
      // I'll assume endpoint POST /orders/:id/cancel exists or I need to create it?
      // Or use updateOrderStatus if user is allowed.
      // Let's assume I need to implement it.
      // For now, I'll allow user to "Request Cancellation" via existing endpoint if possible or add one.
      // Actually, checking orders.routes.ts... no cancel endpoint for user.
      // I will simulate it via status update if backend allows, or just show a toast "Cancellation requested feature coming soon".
      // But user requested "Cancel option".
      // I should add POST /orders/:id/cancel to backend.
      // For this turn, I'll implement the UI call and maybe mock it or fail gracefully.
      // I'll assume we used api.request('POST', `/orders/${order.id}/cancel`) and I need to add that route.
      // Since I can't restart backend edits easily in this specific tool call chain.
      // I'll show the button and make it call an endpoint I will implement next.
      const res = await api.cancelOrder(order.id);
      if (res.success) {
        toast.success("Order cancelled successfully");
        fetchOrder();
      } else {
        toast.error(res.message || "Failed to cancel order");
      }
    } catch (error) {
      toast.error("Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  // Helper to determine timeline state
  const getCurrentStepIndex = (status: string) => {
    if (status === 'CANCELLED') return -1;
    const index = timelineSteps.findIndex(s => s.id === status);
    // Map intermediate statuses if needed
    if (status === 'PAYMENT_PENDING') return 0;
    if (status === 'OUT_FOR_DELIVERY') return 3; 
    return index;
  };
  
  const currentStep = order ? getCurrentStepIndex(order.status) : 0;

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">Order not found</p>
        <Link href="/account/orders" className="text-blue-600 font-medium hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order #{order.orderNumber}</h1>
          <p className="text-slate-500">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition">
                <Download className="h-4 w-4" />
                Invoice
            </button>
            {order.status === 'PENDING' || order.status === 'PAYMENT_PENDING' ? (
                <button 
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                >
                    {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Cancel Order
                </button>
            ) : null}
        </div>
      </div>

       {/* Timeline */}
       {order.status !== 'CANCELLED' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 overflow-hidden">
             <div className="relative flex justify-between">
                {/* Progress Bar Background */}
                <div className="absolute top-4 left-0 w-full h-1 bg-slate-100 -z-10"></div>
                {/* Active Progress Bar */}
                <div 
                    className="absolute top-4 left-0 h-1 bg-blue-600 transition-all duration-500 -z-0"
                    style={{ width: `${(currentStep / (timelineSteps.length - 1)) * 100}%` }}
                ></div>

                {timelineSteps.map((step, index) => {
                    const isActive = index <= currentStep;
                    const isCompleted = index < currentStep;
                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 z-10 bg-white transition-colors ${
                                isActive ? 'border-blue-600 text-blue-600' : 'border-slate-300 text-slate-300'
                            } ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : ''}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <span className={`mt-2 text-xs font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
             </div>
        </div>
       )}

       {order.status === 'CANCELLED' && (
           <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-red-700 flex items-center gap-3">
               <XCircle className="h-5 w-5" />
               <p className="font-medium">This order has been cancelled.</p>
           </div>
       )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Order Items */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-400" />
            Order Items
          </h2>
          <div className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="h-16 w-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.productImage ? (
                    <Image src={item.productImage} alt={item.productName} width={64} height={64} className="object-cover h-full w-full" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{item.productName}</p>
                  <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium text-slate-900">
                  ₵{((item.priceInPesewas * item.quantity) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          {/* Shipping */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-400" />
              Shipping Address
            </h2>
            <p className="text-slate-700">{order.shippingFullName}</p>
            <p className="text-slate-500 text-sm">{order.shippingPhone}</p>
            <p className="text-slate-500 text-sm mt-2">
              {order.shippingStreetAddress}<br />
              {order.shippingCity}, {order.shippingRegion}
            </p>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-slate-400" />
              Payment
            </h2>
            <p className="text-slate-700">{order.paymentMethod.replace(/_/g, " ")}</p>
            <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                    {order.paymentStatus}
                </span>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-700">₵{(order.subtotalInPesewas / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery</span>
                <span className="text-slate-700">₵{(order.deliveryFeeInPesewas / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 font-semibold text-base">
                <span>Total</span>
                <span className="text-blue-600">₵{(order.totalInPesewas / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
