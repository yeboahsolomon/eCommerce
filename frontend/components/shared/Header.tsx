"use client";
import Link from "next/link";
import { Search, ShoppingCart, User, Menu } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function Header() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200 shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-xl">G</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground hidden sm:block group-hover:text-primary transition-colors">
              GhanaMarket
            </span>
          </Link>
        </div>

        {/* Search Bar (Hidden on mobile) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full rounded-full border border-input bg-secondary/10 py-2 pl-4 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 placeholder:text-muted-foreground"
            />
            <button className="absolute right-0 top-0 h-full px-3 text-muted-foreground group-hover:text-primary transition-colors">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative p-2 hover:bg-secondary/20 rounded-full transition-colors group">
            <ShoppingCart className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />

            {/* Only show badge if items exist */}
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center animate-in zoom-in shadow-sm">
                {itemCount}
              </span>
            )}
          </Link>
          
          <Link href="/auth/login" className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors hover:bg-secondary/20 px-4 py-2 rounded-full">
            <User className="h-5 w-5" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
