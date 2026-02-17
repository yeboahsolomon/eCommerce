"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { checkoutSchema, CheckoutFormValues } from "@/lib/validators";
import { CreateOrderInput } from "@/types";
import PaymentMethodSelector from "@/components/checkout/PaymentMethodSelector";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Northern",
  "Volta",
  "Bono",
  "Ahafo",
  "Upper East",
  "Upper West",
  "Savannah",
  "North East",
  "Bono East",
  "Oti",
  "Western North",
];

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const items = cart?.items || [];
  const totalPrice = subtotal;
  const router = useRouter();
  const [orderError, setOrderError] = useState<string | null>(null);

  // Redirect if empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items, router]);

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

  // Delivery fee calculation
  const deliveryFee = totalPrice >= 200 ? 0 : 15;
  const grandTotal = totalPrice + deliveryFee;

  async function onSubmit(data: CheckoutFormValues) {
    setOrderError(null);

    try {
      // Build order payload matching the backend
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
        toast.success("Order placed successfully!");
        
        // Clear cart after successful order
        await clearCart();

        // Redirect to order success page
        router.push(`/order-success/${order.id}`);
      } else {
        setOrderError(res.message || "Failed to place order. Please try again.");
        toast.error(res.message || "Order failed");
      }
    } catch {
      setOrderError("Something went wrong. Please check your connection and try again.");
      toast.error("Something went wrong. Please try again.");
    }
  }

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

          {/* Login prompt for guests */}
          {!isAuthenticated && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Already have an account?</span> Sign in for a faster checkout.
              </p>
              <Link href="/auth/login?redirect=/checkout" className="text-sm font-bold text-blue-600 hover:underline flex-shrink-0 ml-4">
                Sign In
              </Link>
            </div>
          )}

          <form id="checkout-form" onSubmit={handleSubmit(onSubmit)}>
            
            {/* Contact */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Full Name" placeholder="Kwame Mensah" {...register("fullName")} error={errors.fullName?.message} />
                <Input label="Phone Number" placeholder="054XXXXXXX" {...register("phone")} error={errors.phone?.message} />
                <div className="md:col-span-2">
                  <Input label="Email Address" type="email" placeholder="kwame@example.com" {...register("email")} error={errors.email?.message} />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Delivery Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Region</label>
                    <select {...register("region")} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Region</option>
                        {GHANA_REGIONS.map((region) => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                    </select>
                    {errors.region && <p className="text-xs text-red-500">{errors.region.message}</p>}
                </div>
                <Input label="City / Town" placeholder="Accra" {...register("city")} error={errors.city?.message} />
                <div className="md:col-span-2">
                   <Input label="Street Name / Landmark" placeholder="Near the Catholic Church" {...register("address")} error={errors.address?.message} />
                </div>
                <div className="md:col-span-2">
                   <Input label="GhanaPost GPS (Optional)" placeholder="GA-183-8164" {...register("gpsAddress")} error={errors.gpsAddress?.message} />
                   <p className="text-[10px] text-slate-400 mt-1">Helps our riders find you faster.</p>
                </div>
              </div>
            </div>

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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 sticky top-4">
            <h3 className="font-bold text-slate-900 mb-4">Your Order ({items.length} item{items.length !== 1 ? 's' : ''})</h3>
            
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-12 w-12 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                     {item.product.image && <img src={item.product.image} alt={item.product.name} className="object-cover h-full w-full" />}
                     <span className="absolute bottom-0 right-0 bg-slate-800 text-white text-[10px] px-1">{item.quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-slate-500">₵{(item.product.priceInPesewas / 100).toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0">₵{((item.product.priceInPesewas * item.quantity) / 100).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span>₵{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span className="text-slate-500">Delivery Fee</span>
                 {deliveryFee === 0 ? (
                   <span className="text-green-600 font-medium">Free</span>
                 ) : (
                   <span>₵{deliveryFee.toLocaleString()}</span>
                 )}
              </div>
              {deliveryFee === 0 && totalPrice >= 200 && (
                <p className="text-[10px] text-green-600">🎉 Free delivery for orders over ₵200!</p>
              )}
              <div className="flex justify-between text-lg font-bold text-slate-900 pt-2">
                <span>Total</span>
                <span>₵{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              form="checkout-form"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Placing Order..." : (
                <>
                    <Lock className="h-4 w-4" />
                    Pay ₵{grandTotal.toLocaleString()}
                </>
              )}
            </button>
            
            <div className="mt-4 text-center">
               <p className="text-xs text-slate-400">
                 By placing this order, you agree to our Terms of Service.
               </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
