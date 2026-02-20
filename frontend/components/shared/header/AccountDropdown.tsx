"use client";

import Link from "next/link";
import { User, Smartphone, Store, Heart, LogOut, Package, Settings, CreditCard, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function AccountDropdown({ sellerApplication }: { sellerApplication?: any }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return (
      <Link href="/auth/login" className="flex items-center gap-2 hover:bg-slate-100 p-2 rounded-lg transition-colors group">
        <div className="h-10 w-10 rounded-full bg-slate-50 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
            <User className="h-5 w-5 text-slate-600" />
        </div>
        <div className="hidden lg:flex flex-col leading-tight">
          <span className="text-xs text-slate-500">Welcome</span>
          <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Sign In / Join</span>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-50 transition-colors group"
      >
        <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border-2 border-transparent group-hover:border-blue-100 transition-all",
            "bg-blue-100 text-blue-600"
        )}>
          {user?.firstName?.[0] || 'U'}
        </div>
        <div className="hidden lg:flex flex-col items-start leading-tight">
          <span className="text-xs text-slate-500">Hello, {user?.firstName}</span>
          <span className="text-sm font-bold text-slate-900 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
            Account <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl border border-slate-100 shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          <div className="px-5 py-3 border-b border-slate-100 mb-1 bg-slate-50/50">
            <p className="font-bold text-slate-900 truncate text-base">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            {user?.role === 'SELLER' && (
                 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                    Seller Account
                 </span>
            )}
          </div>
          
          <div className="py-1">
            <Link 
                href="/account" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
                <User className="h-4 w-4" /> My Profile
            </Link>
            <Link 
                href="/account/orders" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
                <Package className="h-4 w-4" /> My Orders
            </Link>
            <Link 
                href="/account/wishlist" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
                <Heart className="h-4 w-4" /> Saved Items
            </Link>
             <Link 
                href="/account/settings" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
                <Settings className="h-4 w-4" /> Account Settings
            </Link>
          </div>

          <div className="border-t border-slate-100 my-1 py-1">
            {(user?.role === 'SELLER' || user?.role === 'ADMIN') ? (
                <Link 
                    href="/seller/dashboard" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                >
                    <Store className="h-4 w-4" /> Seller Dashboard
                </Link>
            ) : sellerApplication ? (
                 <Link 
                    href="/seller/status" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                >
                    <Store className="h-4 w-4" /> Seller Status
                </Link>
            ) : (
                 <Link 
                    href="/seller/register" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                >
                    <Store className="h-4 w-4" /> Become a Seller
                </Link>
            )}
          </div>

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button 
                onClick={() => {
                    logout();
                    setIsOpen(false);
                }} 
                className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
            >
                <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
