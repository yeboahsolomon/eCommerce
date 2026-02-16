"use client";

import { X, ChevronRight, User, ShoppingBag, Heart, Store, Globe, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export default function MobileMenu({ isOpen, onClose, categories }: MobileMenuProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-out Menu */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
             <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
               <span className="text-white font-bold text-lg">G</span>
             </div>
             <span className="font-bold text-lg text-slate-900">GhanaMarket</span>
          </Link>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Search */}
          <div className="p-4 border-b border-slate-100">
            <form onSubmit={handleSearch}>
               <input 
                  type="text" 
                  placeholder="Search products..." 
                  className="w-full h-10 px-4 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:border-blue-500 transition-all text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
               />
            </form>
          </div>

          {/* User Section */}
          <div className="p-4 border-b border-slate-100">
             {isAuthenticated ? (
                <div className="flex items-center gap-3 mb-4">
                   <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                     {user?.firstName?.[0] || 'U'}
                   </div>
                   <div>
                     <p className="font-bold text-slate-900 leading-none">{user?.firstName} {user?.lastName}</p>
                     <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
                   </div>
                </div>
             ) : (
                <>
                   <Link href="/auth/login" onClick={onClose} className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl mb-2 font-bold justify-center">
                      <User className="h-5 w-5" /> Sign In / Register
                   </Link>
                   <Link href="/sell" onClick={onClose} className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-purple-600 font-medium py-1 mb-2">
                      <Store className="h-4 w-4" /> Become a Seller
                   </Link>
                </>
             )}
             
             {isAuthenticated && (
                 <div className="grid grid-cols-2 gap-2 mt-2">
                     <Link href="/account/orders" onClick={onClose} className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                         <ShoppingBag className="h-5 w-5 text-slate-600 mb-1" />
                         <span className="text-xs font-medium text-slate-600">Orders</span>
                     </Link>
                     <Link href="/account/wishlist" onClick={onClose} className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                         <Heart className="h-5 w-5 text-slate-600 mb-1" />
                         <span className="text-xs font-medium text-slate-600">Wishlist</span>
                     </Link>
                     {(user?.role === 'SELLER' || user?.role === 'ADMIN') ? (
                         <Link href="/seller/dashboard" onClick={onClose} className="flex flex-col items-center justify-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-100 col-span-2">
                             <Store className="h-5 w-5 text-purple-600 mb-1" />
                             <span className="text-xs font-bold text-purple-700">Seller Dashboard</span>
                         </Link>
                     ) : (
                         <Link href="/sell" onClick={onClose} className="flex flex-col items-center justify-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-100 col-span-2">
                             <Store className="h-5 w-5 text-purple-600 mb-1" />
                             <span className="text-xs font-bold text-purple-700">Become a Seller</span>
                         </Link>
                     )}
                 </div>
             )}
           </div>

           {/* Categories */}
           <div className="p-4">
             <h3 className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-wider">Shop by Category</h3>
             <ul className="space-y-1">
               {categories.map((cat) => (
                 <li key={cat.id}>
                   <Link 
                     href={`/categories/${cat.slug}`} 
                     onClick={onClose}
                     className="flex items-center justify-between py-2 text-slate-600 hover:text-blue-600 transition-colors text-sm"
                   >
                     {cat.name}
                     <ChevronRight className="h-4 w-4 text-slate-300" />
                   </Link>
                 </li>
               ))}
               <li>
                   <Link href="/categories" onClick={onClose} className="flex items-center gap-2 py-2 text-blue-600 font-semibold text-sm">
                      View All Categories
                   </Link>
               </li>
             </ul>
           </div>

           <div className="border-t border-slate-100 p-4">
             <Link href="/deals" onClick={onClose} className="flex items-center justify-between py-2 text-slate-600 hover:text-red-500 transition-colors font-medium">
                Deals & Offers <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">HOT</span>
             </Link>

           </div>
         </div>

         {/* Footer actions */}
         <div className="p-4 border-t border-slate-100 bg-slate-50">
            
            <div className="flex items-center justify-between pt-2">
               <button className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Globe className="h-3 w-3" /> Ghana (GHS)
               </button>
               {isAuthenticated && (
                   <button onClick={() => { logout(); onClose(); }} className="flex items-center gap-2 text-xs text-red-500 font-medium">
                      <LogOut className="h-3 w-3" /> Sign Out
                   </button>
               )}
            </div>
         </div>

      </div>
    </>
  );
}
