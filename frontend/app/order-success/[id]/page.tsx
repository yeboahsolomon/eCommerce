"use client";

import { api } from "@/lib/api";
import { Order } from "@/types";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { 
  CheckCircle2, Package, MapPin, CreditCard, 
  ArrowRight, Loader2, ShoppingBag, Copy, Check, Truck
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.getOrder(id);
        if (res.success && res.data?.order) {
          setOrder(res.data.order as Order);
        }
      } catch {
        // Order may not be accessible
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      toast.success("Order number copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-[bounceIn_0.6s_ease-out]">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Order Placed Successfully!</h1>
          <p className="text-slate-500 text-lg">
            Thank you for shopping on GhanaMarket. We&apos;re getting your order ready.
          </p>
        </div>

        {/* Order Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          
          {/* Order Number */}
          <div className="bg-blue-50 border-b border-blue-100 p-6 text-center">
            <p className="text-sm text-blue-600 font-medium mb-1">Order Number</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold text-slate-900 font-mono tracking-wider">
                {order?.orderNumber || id.slice(0, 8).toUpperCase()}
              </p>
              <button 
                onClick={copyOrderNumber}
                className="h-8 w-8 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {order ? (
            <div className="p-6 space-y-6">
              
              {/* Order Items */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Items Ordered ({order.items?.length || 0})
                </h3>
                
                <div className="space-y-4">
                  {(() => {
                    const groupedItemsMap = new Map<string, { sellerName: string; items: typeof order.items }>();
                    if (order?.items) {
                      order.items.forEach((item) => {
                        const sellerOrderId = item.sellerOrderId || 'PLATFORM';
                        let sellerName = 'GhanaMarket Official';
                        
                        if (sellerOrderId !== 'PLATFORM' && order.sellerOrders) {
                          const matchedSellerOrder = order.sellerOrders.find(so => so.id === sellerOrderId);
                          if (matchedSellerOrder?.seller?.businessName) {
                            sellerName = matchedSellerOrder.seller.businessName;
                          }
                        }
                        
                        if (!groupedItemsMap.has(sellerOrderId)) {
                          groupedItemsMap.set(sellerOrderId, { sellerName, items: [] });
                        }
                        groupedItemsMap.get(sellerOrderId)!.items.push(item);
                      });
                    }

                    return Array.from(groupedItemsMap).map(([sellerOrderId, group], index) => (
                      <div key={sellerOrderId} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                          <span className="text-xs font-bold text-slate-800">Package {index + 1}: {group.sellerName}</span>
                        </div>
                        <div className="space-y-3">
                          {group.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 rounded-lg bg-white border border-slate-100 overflow-hidden flex-shrink-0">
                                  {item.productImage && <Image src={item.productImage} alt={item.productName} fill sizes="40px" className="object-cover" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900 line-clamp-1">{item.productName}</p>
                                  <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-slate-900 flex-shrink-0">₵{item.totalPriceInCedis?.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Delivery Address & ETA */}
              {order.shippingAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      Delivery Address
                    </h3>
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1 h-[calc(100%-2.5rem)]">
                      <p className="font-bold text-slate-900">{order.shippingAddress.fullName}</p>
                      <p>{order.shippingAddress.streetAddress}</p>
                      <p>{order.shippingAddress.city}, {order.shippingAddress.region}</p>
                      <p>{order.shippingAddress.phone}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Truck className="h-5 w-5 text-blue-600" />
                      Estimated Delivery
                    </h3>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-4 h-[calc(100%-2.5rem)]">
                      <div className="bg-white shadow-sm p-3 rounded-full flex-shrink-0">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        {(() => {
                           const today = new Date();
                           today.setDate(today.getDate() + 3);
                           return (
                             <p className="text-lg font-extrabold text-blue-600">
                               {today.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                             </p>
                           );
                        })()}
                        <p className="text-xs text-slate-500 font-medium mt-1">Between 8:00 AM - 6:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment & Total */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  Payment Summary
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span>₵{order.subtotalInCedis?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery Fee</span>
                    <span>{order.shippingInCedis === 0 ? <span className="text-green-600 font-medium">Free</span> : `₵${order.shippingInCedis?.toLocaleString()}`}</span>
                  </div>
                  {order.discountInCedis > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-₵{order.discountInCedis.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Paid</span>
                    <span>₵{order.totalInCedis?.toLocaleString()}</span>
                  </div>
                  {order.payment?.method && (
                    <p className="text-xs text-slate-400 pt-1">
                      Paid via {order.payment.method === "MOMO" ? "Mobile Money" : order.payment.method === "CARD" ? "Debit/Credit Card" : order.payment.method}
                    </p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-slate-500">Your order has been placed! You can track it in your account.</p>
            </div>
          )}
        </div>

        {/* What Happens Next */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-4">What Happens Next?</h3>
          <div className="space-y-4">
            {[
              { step: "1", title: "Order Confirmed", desc: "We've received your order and will process it shortly.", active: true },
              { step: "2", title: "Preparing Your Order", desc: "The seller is packaging your items.", active: false },
              { step: "3", title: "Out for Delivery", desc: "A rider will deliver your order to your doorstep.", active: false },
              { step: "4", title: "Delivered!", desc: "Enjoy your purchase! Don't forget to leave a review.", active: false },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  item.active 
                    ? "bg-blue-600 text-white" 
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {item.step}
                </div>
                <div>
                  <p className={`font-medium text-sm ${item.active ? "text-slate-900" : "text-slate-400"}`}>{item.title}</p>
                  <p className={`text-xs ${item.active ? "text-slate-500" : "text-slate-300"}`}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/account/orders" 
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            <Package className="h-5 w-5" />
            Track Your Order
          </Link>
          <Link 
            href="/products" 
            className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-900 py-4 rounded-xl font-bold border border-slate-300 hover:bg-slate-50 transition"
          >
            <ShoppingBag className="h-5 w-5" />
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
