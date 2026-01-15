import Link from "next/link";
import { Search, ShoppingCart, User, Menu } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">
              GhanaMarket
            </span>
          </Link>
        </div>

        {/* Search Bar (Hidden on small mobile) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full rounded-full border border-slate-300 bg-slate-50 py-2 pl-4 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-blue-600">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative p-2 hover:bg-slate-100 rounded-full transition">
            <ShoppingCart className="h-6 w-6 text-slate-700" />
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              2
            </span>
          </Link>
          
          <Link href="/login" className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600">
            <User className="h-5 w-5" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
