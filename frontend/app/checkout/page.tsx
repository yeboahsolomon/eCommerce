"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { checkoutSchema, CheckoutFormValues } from "@/lib/validations/schema";
import { CreateOrderInput } from "@/types";
import PaymentMethodSelector from "@/components/checkout/PaymentMethodSelector";
import CheckoutDeliveryForm from "@/components/checkout/CheckoutDeliveryForm";
import CheckoutSummarySidebar from "@/components/checkout/CheckoutSummarySidebar";
import { api } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import PhoneVerificationModal from "@/components/auth/PhoneVerificationModal";

import { GHANA_REGIONS } from "@/lib/constants";

export default function CheckoutPage() {
  const { cart, subtotal, clearCart, isLoading: isCartLoading } = useCart();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const items = cart?.items || [];
  const totalPrice = subtotal;
  const router = useRouter();
  const [orderError, setOrderError] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [sellerPackages, setSellerPackages] = useState<any[]>([]);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<CheckoutFormValues | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Auth guard: redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/checkout");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Redirect if empty cart
  useEffect(() => {
    if (!isCartLoading && !isAuthLoading && isAuthenticated && items.length === 0) {
      router.push("/cart");
    }
  }, [items, router, isCartLoading, isAuthLoading, isAuthenticated]);

  // Show loading while auth is being checked
  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: "MOMO",
      fullName: user ? `${user.firstName} ${user.lastName}` : "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  const selectedPayment = watch("paymentMethod");
  const watchRegion = watch("region");
  const watchCity = watch("city");

  // Stable reference for item count to avoid infinite re-renders
  const itemCount = cart?.items?.length ?? 0;

  // Calculate delivery fee when buyer selects region/city
  useEffect(() => {
    // Don't calculate until the buyer has at least selected a region
    if (!watchRegion || itemCount === 0) {
      setDeliveryFee(0);
      setSellerPackages([]);
      return;
    }

    let isMounted = true;
    const debounceTimer = setTimeout(async () => {
      setIsCalculatingShipping(true);
      try {
        const res = await api.calculateCheckout({
          shippingRegion: watchRegion,
          shippingCity: watchCity || undefined,
          currentCart: { items: cart?.items || [] }
        });
        
        if (res.success && res.data && isMounted) {
          setDeliveryFee(res.data.shippingInCedis);
          if (res.data.sellers) {
            setSellerPackages(res.data.sellers);
          }
        }
      } catch (error) {
        console.error("Failed to calculate shipping", error);
      } finally {
        if (isMounted) setIsCalculatingShipping(false);
      }
    }, 400); // Debounce 400ms so city typing doesn't spam the API

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [watchRegion, watchCity, itemCount]);

  const grandTotal = totalPrice + deliveryFee;

  // Group items locally for display if API hasn't responded yet
  const groupedItemsMap = useMemo(() => {
    return items.reduce((acc, item) => {
      const sellerId = item.product.seller?.id || 'GHANA_MARKET';
      const sellerName = item.product.seller?.businessName || 'GhanaMarket Official';
      if (!acc.has(sellerId)) {
        acc.set(sellerId, { name: sellerName, items: [] });
      }
      acc.get(sellerId)!.items.push(item);
      return acc;
    }, new Map<string, { name: string; items: typeof items }>());
  }, [items]);


  async function onSubmit(data: CheckoutFormValues) {
    setOrderError(null);

    // If phone is not verified (first time checkout effectively), show OTP modal
    if (!user?.phoneVerified) {
      setPendingOrderData(data);
      setShowOtpModal(true);
      return;
    }

    await executeOrder(data);
  }

  const executeOrder = async (data: CheckoutFormValues) => {
    setIsPlacingOrder(true);
    try {
      // Build order payload matching the backend
      const orderPayload = {
        shippingFullName: data.fullName,
        shippingPhone: data.phone,
        shippingRegion: data.region,
        shippingCity: data.city,
        shippingStreetAddress: data.address,
        shippingGpsAddress: data.gpsAddress || undefined,
        
        customerEmail: data.email,
        customerPhone: data.phone,

        paymentMethod: (data.paymentMethod === 'MOMO' ? 'MOMO_MTN' : 
                      data.paymentMethod === 'CASH' ? 'CASH_ON_DELIVERY' : 
                      'CARD') as CreateOrderInput['paymentMethod'],
        deliveryNotes: "",
      };

      const res = await api.createOrder(orderPayload);

      if (res.success && res.data?.order) {
        const order = res.data.order;
        
        // Clear cart after successful order
        await clearCart();

        // If Paystack returned a payment URL, redirect to Paystack
        if (res.data.paymentUrl) {
          toast.success("Redirecting to payment...");
          window.location.href = res.data.paymentUrl;
          return;
        }

        // Cash on Delivery or payment init failed — go to order success
        toast.success("Order placed successfully!");
        router.push(`/order-success/${order.id}`);
      } else {
        setOrderError(res.message || "Failed to place order. Please try again.");
        toast.error(res.message || "Order failed");
      }
    } catch {
      setOrderError("Something went wrong. Please check your connection and try again.");
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePhoneVerified = async (idToken: string) => {
    if (!pendingOrderData) return;
    try {
      setIsPlacingOrder(true);
      const verifyRes = await api.verifyPhone(idToken, pendingOrderData.phone);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (verifyRes && (verifyRes as any).success) {
        // Introduce a short delay so the toast notifications do not overlap
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Proceed with order now that phone is verified
        await executeOrder(pendingOrderData);
      } else {
        toast.error("Failed to verify phone on server.");
      }
    } catch (err) {
      toast.error("An error occurred confirming verification.");
    } finally {
      setIsPlacingOrder(false);
      setPendingOrderData(null);
    }
  };

  if (items.length === 0) return null; // Avoids flash of content before redirect

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Simple Header */}
      <div className="bg-white border-b border-slate-200 py-4 mb-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link href="/cart" className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Cart
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Checkout</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: Shipping Form */}
        <div className="lg:col-span-8 space-y-6">

          {/* Error Banner */}
          {orderError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Order could not be placed</p>
                <p className="text-sm mt-1">{orderError}</p>
              </div>
            </div>
          )}

          <form id="checkout-form" onSubmit={handleSubmit(onSubmit)}>
            
            <CheckoutDeliveryForm register={register} errors={errors} />

            {/* Payment */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Payment Method</h2>
              <PaymentMethodSelector 
                selected={selectedPayment} 
                onSelect={(val) => setValue("paymentMethod", val)} 
              />
            </div>

          </form>
        </div>

        {/* RIGHT: Order Summary */}
        <div className="lg:col-span-4">
          <CheckoutSummarySidebar 
            itemCount={itemCount}
            groupedItemsMap={groupedItemsMap}
            sellerPackages={sellerPackages}
            isCalculatingShipping={isCalculatingShipping}
            watchRegion={watchRegion}
            totalPrice={totalPrice}
            deliveryFee={deliveryFee}
            grandTotal={grandTotal}
            isSubmitting={isSubmitting || isPlacingOrder}
          />
        </div>

      </div>

      {showOtpModal && pendingOrderData?.phone && (
        <PhoneVerificationModal
          isOpen={showOtpModal}
          onClose={() => {
            setShowOtpModal(false);
            setPendingOrderData(null);
          }}
          phoneNumber={pendingOrderData.phone}
          onSuccess={handlePhoneVerified}
        />
      )}
    </div>
  );
}
