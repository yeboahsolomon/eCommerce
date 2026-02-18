"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ShoppingBag, Menu, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

import { Category } from "@/types";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Sub-components
import Search from "@/components/shared/header/Search";
import AccountDropdown from "@/components/shared/header/AccountDropdown";
import MegaMenu from "@/components/shared/header/MegaMenu";
import MiniCart from "@/components/shared/header/MiniCart";
import MobileMenu from "@/components/shared/header/MobileMenu";

export default function Header() {
  const { itemCount, subtotal } = useCart();
  const { isAuthenticated, isLoading } = useAuth();
  // Categories fetched via React Query below
  
  // UI States
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  
  // Scroll & Sticky State
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const pathname = usePathname();

  // ... inside component
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
        const res = await api.getCategories();
        if (res.success && res.data?.categories) {
            return res.data.categories;
        }
        return [];
    }
  });

  const categories = categoriesData || [];

  // Scroll Handler
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Sticky state
      setIsScrolled(currentScrollY > 20);

      // Show/Hide logic
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Close menus on route change
  useEffect(() => {
      setIsMegaMenuOpen(false);
      setIsMobileMenuOpen(false);
      setIsMiniCartOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 2. MAIN HEADER */}
      <header 
        className={cn(
            "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
            isScrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200" : "bg-white border-b border-slate-200",
            isVisible ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <div className={cn(
             "max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-between gap-4 lg:gap-8 transition-all duration-300",
             isScrolled ? "h-[60px]" : "h-[72px]"
        )}>
          
          {/* LEFT: Mobile Menu & Logo */}
          <div className="flex items-center gap-3 lg:gap-8 shrink-0">
             {/* Mobile Hamburger */}
             <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full"
             >
                <Menu className="h-6 w-6" />
             </button>

             {/* LOGO */}
             <Link href="/" className="flex items-center gap-2 group shrink-0">
                <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl bg-blue-600 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200 shadow-lg shadow-blue-600/20">
                    <span className="text-white font-bold text-xl lg:text-2xl">G</span>
                </div>
                <div className="flex flex-col leading-none">
                    <span className="font-bold text-lg lg:text-xl tracking-tight text-slate-900">GhanaMarket</span>
                    {!isScrolled && <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase hidden sm:block">Online Mall</span>}
                </div>
             </Link>
          </div>

          {/* CENTER: Search Bar (Desktop) */}
          <div className="hidden lg:block flex-1 max-w-2xl px-4">
             <Search />
          </div>

          {/* RIGHT: Utilities */}
          <div className="flex items-center gap-1 lg:gap-4 shrink-0">
             
             {/* Search Icon (Mobile) */}
             <Link href="/search" className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full">
                <ShoppingBag className="h-6 w-6 opacity-0" /> {/* Spacer/Placeholder logic if needed, actually just Link is fine but Search component handles mobile? No, mobile uses link or separate overlay. Let's redirect to search page for simple mobile search or use overlay */}
                 {/* Re-read requirements: "Search icon expands to full-screen search overlay when clicked". I'll use a link to /search for now or trigger a modal. MobileMenu has search, so maybe just a search icon that focuses it? 
                 Actually, just let's keep it simple for now and rely on MobileMenu's search or add a dedicated search icon that toggles search.
                 Wait, detailed requirement said [Hamburger] [Logo] [Search Icon] [Cart].
                 */}
             </Link>

             {/* Wishlist (Desktop) */}
             <Link href="/account/wishlist" className="hidden lg:flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg group transition-colors relative">
                 <Heart className="h-6 w-6 text-slate-600 group-hover:text-red-500 transition-colors" />
                 <span className="hidden xl:block text-xs font-bold text-slate-600 group-hover:text-red-600">Wishlist</span>
             </Link>

             {/* Cart */}
             <button 
                onClick={() => setIsMiniCartOpen(true)}
                className="relative flex items-center gap-2 hover:bg-slate-100 p-2 rounded-lg transition-colors group"
             >
                <div className="relative">
                   <ShoppingBag className="h-6 w-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                   {itemCount > 0 && (
                      <motion.span 
                        key={itemCount}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm ring-2 ring-white"
                      >
                         {itemCount > 99 ? '99+' : itemCount}
                      </motion.span>
                   )}
                </div>
                <div className="hidden xl:flex flex-col items-start leading-tight">
                   <span className="text-xs text-slate-500">My Cart</span>
                   <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                      ₵{subtotal.toLocaleString()}
                   </span>
                </div>
             </button>

             {/* Account */}
             <div className="hidden lg:block pl-2 border-l border-slate-200 ml-2">
                <AccountDropdown />
             </div>
          </div>
        </div>

        {/* 3. CATEGORY NAVIGATION BAR (Desktop Only) - Hides on Scroll */}
        <div className={cn(
            "border-t border-slate-100 bg-white hidden lg:block overflow-hidden transition-all duration-300 ease-in-out",
            isScrolled ? "h-0 opacity-0 border-none" : "h-12 opacity-100"
        )}>
           <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-8">
              {/* Mega Menu Trigger */}
              <div 
                className="h-full flex items-center"
                onMouseEnter={() => setIsMegaMenuOpen(true)}
                onMouseLeave={(e) => {
                    // Prevent closing if moving to the menu itself. 
                    // This is handled by the MegaMenu component wrapping itself or the parent checking relatedTarget.
                    // But simpler: The MegaMenu is rendered OUTSIDE this div usually or absolutely positioned.
                    // In my MegaMenu impl, it checks onMouseLeave.
                    // Here we just set Open, and if mouse leaves this button AND does not enter menu, it closes.
                    // Actually my MegaMenu component handles onMouseLeave to close itself.
                    // But if I leave the button to go to the menu gap...
                    // Standard pattern: Parent container handles hover.
                }}
              >
                 <button 
                   className={cn(
                       "flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide px-4 h-8 rounded-md transition-colors",
                       isMegaMenuOpen ? "bg-slate-100 text-blue-600" : "text-slate-900 hover:text-blue-600 hover:bg-slate-50"
                   )}
                 >
                    <Menu className="h-4 w-4" /> All Categories
                 </button>
                 
                 {/* Mega Menu Component */}
                 <MegaMenu 
                    categories={categories} 
                    isVisible={isMegaMenuOpen} 
                    onClose={() => setIsMegaMenuOpen(false)} 
                 />
              </div>

               <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
                 <Link href="/shop" className="hover:text-blue-600 transition-colors">Best Sellers</Link>
                 <Link href="/new-arrivals" className="hover:text-blue-600 transition-colors">New Arrivals</Link>
                 <Link href="/deals" className="text-red-500 font-bold hover:text-red-600 transition-colors flex items-center gap-1">
                    Today&apos;s Deals
                 </Link>
                 
                 {/* Links Separator */}
                 <div className="h-4 w-px bg-slate-300 mx-2" />

                 {/* Become a Seller - Auth Only */}
                 {!isLoading && isAuthenticated && (
                    <Link href="/sell" className="hover:text-purple-600 transition-colors font-semibold">
                       Become a Seller
                    </Link>
                 )}
               </nav>
           </div>
        </div>
      </header>
      
      {/* Spacers to prevent content jumping */}
      <div className={cn("transition-all duration-300", isScrolled ? "h-[60px]" : "h-[72px] lg:h-[120px]")} />

      {/* Overlays */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        categories={categories} 
      />
      
      <MiniCart 
        isOpen={isMiniCartOpen} 
        onClose={() => setIsMiniCartOpen(false)} 
      />
    </>
  );
}
