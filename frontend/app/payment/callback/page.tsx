"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [orderData, setOrderData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setErrorMessage("No payment reference found.");
      return;
    }

    async function verifyPayment() {
      try {
        const res = await api.verifyPaystackPayment(reference!);
        
        if (res.success && res.data?.status?.toUpperCase() === "SUCCESS") {
          setStatus("success");
          setOrderData(res.data);
        } else {
          setStatus("failed");
          setErrorMessage(res.data?.message || res.message || "Payment verification failed.");
        }
      } catch (error: any) {
        setStatus("failed");
        setErrorMessage("Could not verify payment. Please check your orders page.");
      }
    }

    verifyPayment();
  }, [reference]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying Payment</h2>
          <p className="text-slate-500">Please wait while we confirm your payment...</p>
          <p className="text-xs text-slate-400 mt-4">Reference: {reference}</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful! 🎉</h2>
          <p className="text-slate-500 mb-6">
            Medaase! Your payment has been confirmed. Your order is now being processed.
          </p>

          {orderData && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
              {orderData.orderNumber && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Order Number</span>
                  <span className="font-bold">{orderData.orderNumber}</span>
                </div>
              )}
              {orderData.channel && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-medium">{orderData.channel === 'mobile_money' ? 'Mobile Money' : 'Card'}</span>
                </div>
              )}
              {orderData.cardLast4 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Card</span>
                  <span className="font-medium">•••• {orderData.cardLast4}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/orders"
              className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
            >
              View My Orders
            </Link>
            <Link
              href="/shop"
              className="block w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Failed
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Failed</h2>
        <p className="text-slate-500 mb-2">
          {errorMessage || "Your payment could not be completed."}
        </p>
        <p className="text-sm text-slate-400 mb-6">
          Don't worry — your order is saved. You can retry payment from your orders page.
        </p>

        <div className="space-y-3">
          <Link
            href="/orders"
            className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
          >
            Go to My Orders
          </Link>
          <Link
            href="/checkout"
            className="block w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
