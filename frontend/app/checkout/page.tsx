"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Input } from "@/components/ui/Input";
import { checkoutSchema, CheckoutFormValues } from "@/lib/validators";
import PaymentMethodSelector from "@/components/checkout/PaymentMethodSelector";
import { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const router = useRouter();

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
    },
  });

  const selectedPayment = watch("paymentMethod");

  async function onSubmit(data: CheckoutFormValues) {
    // Simulate API Call
    console.log("Processing Order...", { ...data, items, total: totalPrice });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    alert("Order Placed Successfully! (Check Console)");
    router.push("/order-success"); // We will build this later
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
                        <option value="Greater Accra">Greater Accra</option>
                        <option value="Ashanti">Ashanti</option>
                        <option value="Bono">Bono</option>
                        <option value="Ahafo">Ahafo</option>
                        <option value="Central">Central</option>
                        <option value="Western">Western</option>
                        {/* Add others */}
                    </select>
                    {errors.region && <p className="text-xs text-red-500">{errors.region.message}</p>}
                </div>
                <Input label="City / Town" placeholder="Drobo" {...register("city")} error={errors.city?.message} />
                <div className="md:col-span-2">
                   <Input label="Street Name / Landmark" placeholder="Near the Catholic Church" {...register("address")} error={errors.address?.message} />
                </div>
                <div className="md:col-span-2">
                   <Input label="GhanaPost GPS (Optional)" placeholder="BI-0000-1234" {...register("gpsAddress")} error={errors.gpsAddress?.message} />
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
            <h3 className="font-bold text-slate-900 mb-4">Your Order ({items.length} items)</h3>
            
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-12 w-12 rounded bg-slate-100 overflow-hidden">
                     {/* In production, we use Image component here */}
                     <img src={item.image} alt={item.name} className="object-cover h-full w-full" />
                     <span className="absolute bottom-0 right-0 bg-slate-800 text-white text-[10px] px-1">{item.quantity}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                    <p className="text-xs text-slate-500">₵{item.price}</p>
                  </div>
                  <p className="text-sm font-bold">₵{item.price * item.quantity}</p>
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
                 <span className="text-green-600 font-medium">Free</span> 
                 {/* Logic for delivery fee calculation would go here */}
              </div>
              <div className="flex justify-between text-lg font-bold text-slate-900 pt-2">
                <span>Total</span>
                <span>₵{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <button
              form="checkout-form"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Processing..." : (
                <>
                    <Lock className="h-4 w-4" />
                    Pay ₵{totalPrice.toLocaleString()}
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
