"use client";

import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MiniCart({ isOpen, onClose }: MiniCartProps) {
  const { cart, removeItem, updateQuantity, subtotal } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        // Disable body scroll when cart is open
        document.body.style.overflow = 'hidden';
    }
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle Esc key
  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
          if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
            "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Slide-out Panel */}
      <div 
        ref={panelRef}
        className={cn(
            "fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
            isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" /> Your Cart ({cart?.itemCount || 0})
            </h2>
            <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
                <X className="h-5 w-5" />
            </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {!cart || cart.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center">
                        <ShoppingBag className="h-10 w-10 text-slate-300" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Your cart is empty</h3>
                        <p className="text-sm text-slate-500 mt-1">Looks like you haven&apos;t added anything yet.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors"
                    >
                        Start Shopping
                    </button>
                </div>
            ) : (
                cart.items.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                        <div className="relative h-20 w-20 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                            {item.product.image ? (
                                <Image
                                    src={item.product.image}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-300 text-xs">No Img</div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h4 className="text-sm font-medium text-slate-900 line-clamp-2 leading-tight">
                                    <Link href={`/products/${item.product.slug}`} onClick={onClose} className="hover:text-blue-600 transition-colors">
                                        {item.product.name}
                                    </Link>
                                </h4>
                                <p className="text-sm font-bold text-slate-900 mt-1">
                                    ₵{((item.product.priceInPesewas / 100)).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center border border-slate-200 rounded-lg">
                                    <button 
                                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                        className="p-1 px-2 hover:bg-slate-50 text-slate-500 disabled:opacity-50"
                                        disabled={item.quantity <= 1}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="text-xs font-semibold w-6 text-center">{item.quantity}</span>
                                    <button 
                                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                        className="p-1 px-2 hover:bg-slate-50 text-slate-500"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => removeItem(item.productId)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remove item"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Footer / Checkout */}
        {cart && cart.items.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-500 font-medium">Subtotal</span>
                    <span className="text-xl font-bold text-slate-900">₵{subtotal.toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-400 mb-4 text-center">Shipping and taxes calculated at checkout.</p>
                <div className="grid gap-3">
                    <Link 
                        href="/checkout"
                        onClick={onClose}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                    >
                        Checkout Now <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link 
                        href="/cart"
                        onClick={onClose}
                        className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center justify-center transition-colors"
                    >
                        View Full Cart
                    </Link>
                </div>
            </div>
        )}
      </div>
    </>
  );
}
