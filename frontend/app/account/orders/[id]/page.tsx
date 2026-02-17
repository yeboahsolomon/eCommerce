"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Loader2, Package, MapPin, CreditCard, ArrowLeft } from "lucide-react";

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

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    if (!authLoading) {
      fetchOrder();
    }
  }, [isAuthenticated, authLoading, params.id]);

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
    <div className="max-w-4xl mx-auto">
      {/* Back Link */}
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order #{order.orderNumber}</h1>
          <p className="text-slate-500">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[order.status] || "bg-slate-100 text-slate-600"}`}>
          {order.status}
        </span>
      </div>

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
            <p className="text-sm text-slate-500">Status: {order.paymentStatus}</p>
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
