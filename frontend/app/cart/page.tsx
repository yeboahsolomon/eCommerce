"use client";

import Link from "next/link";
import { ShieldCheck, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import CartItemRow from "@/components/cart/CartItemRow";

export default function CartPage() {
  const { cart, subtotal } = useCart();
  const items = cart?.items || [];
  const totalPrice = subtotal;

  // --- LOADING STATE ---
  const { isLoading } = useCart();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // --- EMPTY STATE ---
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-blue-50 p-6 rounded-full mb-6">
          <ShoppingBag className="h-12 w-12 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8 max-w-sm">
          Looks like you haven&apos;t added anything yet. Browse our categories to find the best deals in Ghana.
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
    <div className="max-w-7xl mx-auto pb-24 md:pb-0">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Cart Items */}
        <div className="lg:col-span-8 space-y-6">
          {Array.from(
            items.reduce((acc, item) => {
              const sellerId = item.product.seller?.id || 'GHANA_MARKET';
              const sellerName = item.product.seller?.businessName || 'GhanaMarket Official';
              if (!acc.has(sellerId)) {
                acc.set(sellerId, { name: sellerName, items: [] });
              }
              acc.get(sellerId)!.items.push(item);
              return acc;
            }, new Map<string, { name: string; items: typeof items }>())
          ).map(([sellerId, group], index) => (
            <div key={sellerId} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">Package {index + 1}</span>
                  <span className="font-medium text-slate-800 text-sm">Sold by <span className="font-bold">{group.name}</span></span>
                </div>
              </div>
              <div className="p-4 sm:p-6 divide-y divide-slate-100">
                {group.items.map((item) => (
                  <div key={item.id} className="pt-4 first:pt-0">
                    <CartItemRow item={item} />
                  </div>
                ))}
              </div>
            </div>
          ))}
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
            <Link href="/checkout" className="block w-full text-center bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98]">
              Proceed to Checkout
            </Link>

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



    </div>
  );
}
