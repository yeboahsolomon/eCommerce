'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import type { TrackingOrder, TrackingOrderItem } from '@/types';
import {
  ArrowLeft, Package, Truck, CheckCircle2, CreditCard,
  Clock, MapPin, Phone, AlertCircle, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/shared/Breadcrumbs';

const ORDER_STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: Package },
  { key: 'CONFIRMED', label: 'Payment Confirmed', icon: CreditCard },
  { key: 'PROCESSING', label: 'Processing', icon: Clock },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

const STATUS_INDEX: Record<string, number> = {
  PENDING: 0,
  PAYMENT_PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  PARTIALLY_SHIPPED: 3,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Accra',
  });
}

export default function OrderTrackingPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['track-order', orderNumber],
    queryFn: () => api.trackOrder(orderNumber),
    enabled: !!orderNumber,
    retry: 1,
  });

  const order: TrackingOrder | undefined = data?.data?.order;
  const currentStep = order ? (STATUS_INDEX[order.status] ?? 0) : 0;
  const isCancelled = order?.status === 'CANCELLED' || order?.status === 'FAILED';
  const isRefunded = order?.status === 'REFUNDED';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Breadcrumbs items={[{ label: 'Track Order', href: undefined }]} className="mb-6" />

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Track Your Order</h1>
        <p className="text-gray-500 text-sm mb-8">Order #{orderNumber}</p>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        ) : !order ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900">Order Not Found</h2>
            <p className="text-gray-500 text-sm">
              No order found with number <strong>{orderNumber}</strong>. Please check the number and try again.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm mt-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`rounded-xl p-5 ${
              isCancelled ? 'bg-red-50 border border-red-200' :
              isRefunded ? 'bg-amber-50 border border-amber-200' :
              currentStep >= 4 ? 'bg-green-50 border border-green-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center gap-3">
                {isCancelled ? (
                  <AlertCircle className="h-6 w-6 text-red-500" />
                ) : isRefunded ? (
                  <AlertCircle className="h-6 w-6 text-amber-500" />
                ) : currentStep >= 4 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <Truck className="h-6 w-6 text-blue-600" />
                )}
                <div>
                  <p className={`font-semibold ${
                    isCancelled ? 'text-red-800' :
                    isRefunded ? 'text-amber-800' :
                    currentStep >= 4 ? 'text-green-800' : 'text-blue-800'
                  }`}>
                    {isCancelled ? 'Order Cancelled' :
                     isRefunded ? 'Order Refunded' :
                     currentStep >= 4 ? 'Order Delivered!' :
                     `Status: ${order.status.replace(/_/g, ' ')}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Last updated: {formatDate(order.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            {!isCancelled && !isRefunded && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between relative">
                  {/* Connection line */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
                  <div
                    className="absolute top-5 left-0 h-0.5 bg-blue-600 z-0 transition-all duration-500"
                    style={{ width: `${(currentStep / (ORDER_STEPS.length - 1)) * 100}%` }}
                  />

                  {ORDER_STEPS.map((step, i) => {
                    const isComplete = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isComplete
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'bg-gray-100 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                          <step.icon className="h-5 w-5" />
                        </div>
                        <span className={`text-[11px] font-medium text-center leading-tight max-w-[70px] ${
                          isComplete ? 'text-blue-700' : 'text-gray-400'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order Details */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y">
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Order Number</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(order.orderNumber); toast.success('Copied!'); }}
                      className="flex items-center gap-1 font-mono font-medium text-gray-900 hover:text-blue-600"
                    >
                      {order.orderNumber} <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div>
                    <p className="text-gray-500">Date Placed</p>
                    <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="font-bold text-gray-900">GH₵{(order.totalInPesewas / 100).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment</p>
                    <p className="font-medium text-gray-900">{order.paymentMethod?.replace(/_/g, ' ') || 'Pending'}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              {order.items && order.items.length > 0 && (
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Items ({order.items.length})</h3>
                  <div className="space-y-3">
                    {order.items.map((item: TrackingOrderItem) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                          {item.product?.image ? (
                            <Image src={item.product.image} alt={item.productName} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                          {item.variantName && (
                            <p className="text-xs text-gray-500 truncate">{item.variantName}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 shrink-0">
                          GH₵{((item.priceInPesewas * item.quantity) / 100).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery */}
              {order.deliveryAddress && (
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">Delivery Address</h3>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p>{order.deliveryName}</p>
                      <p>{order.deliveryAddress}, {order.deliveryCity}</p>
                      <p>{order.deliveryRegion}</p>
                    </div>
                  </div>
                  {order.deliveryPhone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                      <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                      <p>{order.deliveryPhone}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
