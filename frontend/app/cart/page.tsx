"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import CartItemRow from "@/components/cart/CartItemRow";

export default function CartPage() {
  const { items, totalPrice } = useCart();

  // --- EMPTY STATE ---
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-blue-50 p-6 rounded-full mb-6">
          <ShoppingBag className="h-12 w-12 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8 max-w-sm">
          Looks like you haven't added anything yet. Browse our categories to find the best deals in Ghana.
        </p>
        <Link
          href="/"
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  // --- FILLED CART STATE ---
  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-0"> {/* Padding bottom for mobile nav */}
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Cart Items */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6">
            {items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₵{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className="text-sm italic">Calculated at checkout</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-lg text-slate-900">
                <span>Total</span>
                <span>₵{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98]">
              Proceed to Checkout
            </button>

            {/* Trust Badges */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 py-2 rounded-lg">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>Secure Payment via MoMo & Card</span>
            </div>
            
            <Link href="/" className="mt-4 block text-center text-sm text-blue-600 hover:underline">
               Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY CHECKOUT */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-200 p-4 md:hidden z-40">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-bold text-slate-900">₵{totalPrice.toLocaleString()}</p>
          </div>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-md">
            Checkout
          </button>
        </div>
      </div>

    </div>
  );
}
