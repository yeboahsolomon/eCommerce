"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, User, Menu, Heart, ChevronDown, Smartphone, Store } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect, FormEvent } from "react";
import { axiosInstance } from "@/lib/axios";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function Header() {
  const router = useRouter();
  const { itemCount, subtotal } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [categories, setCategories] = useState<Category[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axiosInstance.get('/categories');
        if (res.data.success) {
           setCategories(res.data.data.categories);
        }
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    fetchCategories();
  }, []);
  
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Smart Navbar Scroll Handler
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex flex-col w-full z-50">
      {/* 2. MAIN HEADER: Logo, Search, Actions */}
      <header 
        className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm z-40 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-20 flex items-center justify-between gap-8">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
             <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200 shadow-lg shadow-blue-600/20">
               <span className="text-white font-bold text-2xl">G</span>
             </div>
             <div className="flex flex-col leading-none">
                <span className="font-bold text-xl tracking-tight text-slate-900">GhanaMarket</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Online Mall</span>
             </div>
          </Link>

          {/* SEARCH BAR (Desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl relative">
             <div className="flex w-full">
                <button type="button" className="flex items-center gap-2 px-4 bg-slate-100 border border-slate-300 border-r-0 rounded-l-full text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">
                   All <ChevronDown className="h-3 w-3" />
                </button>
                <div className="relative flex-1">
                   <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Search for products..."
                     className="w-full h-11 border border-slate-300 border-x-0 bg-white px-4 text-sm outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400"
                   />
                </div>
                <button type="submit" className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-r-full flex items-center justify-center transition-colors shadow-sm">
                   <Search className="h-5 w-5" />
                </button>
             </div>
          </form>

          {/* MOBILE SEARCH ICON (Visible only on mobile) */}
          <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <Search className="h-6 w-6" />
          </button>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-2 lg:gap-6 shrink-0">
             
             {/* Account Dropdown */}
             <div className="relative z-50">
                {isAuthenticated ? (
                  <div className="relative" ref={profileRef}>
                    <button 
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {user?.firstName?.[0] || 'U'}
                      </div>
                      <div className="hidden lg:flex flex-col items-start leading-tight">
                        <span className="text-xs text-slate-500">Hello, {user?.firstName}</span>
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                          Account <ChevronDown className="h-3 w-3" />
                        </span>
                      </div>
                    </button>

                     {/* Dropdown Menu */}
                    {isProfileOpen && (
                      <div className="absolute right-0 mt-4 w-60 bg-white rounded-2xl border border-slate-100 shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-4 py-3 border-b border-slate-100 mb-1">
                           <p className="font-bold text-slate-900 truncate">{user?.email}</p>
                           <p className="text-xs text-green-600 font-medium mt-0.5">Verified Member</p>
                        </div>
                        <Link href="/account" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                           <User className="h-4 w-4" /> My Profile
                        </Link>
                        <Link href="/account/orders" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                           <Smartphone className="h-4 w-4" /> My Orders
                        </Link>
                        {(user?.role === 'SELLER' || user?.role === 'ADMIN') && (
                           <Link href="/seller/products" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                              <Store className="h-4 w-4" /> Seller Dashboard
                           </Link>
                        )}
                        <Link href="/account/wishlist" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                           <Heart className="h-4 w-4" /> Saved Items
                        </Link>
                        <div className="border-t border-slate-100 mt-1 pt-1">
                           <button onClick={logout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                              Sign Out
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href="/auth/login" className="flex items-center gap-2 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                     <User className="h-6 w-6 text-slate-900" />
                     <div className="hidden lg:flex flex-col leading-tight">
                        <span className="text-xs text-slate-500">Welcome</span>
                        <span className="text-sm font-bold text-slate-900">Sign In</span>
                     </div>
                  </Link>
                )}
             </div>

             {/* Cart */}
             <Link href="/cart" className="relative flex items-center gap-2 hover:bg-slate-100 p-2 rounded-lg transition-colors group">
                <div className="relative">
                   <ShoppingCart className="h-6 w-6 text-slate-900 group-hover:text-blue-600 transition-colors" />
                   {itemCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                         {itemCount}
                      </span>
                   )}
                </div>
                <div className="hidden lg:flex flex-col leading-tight">
                   <span className="text-xs text-slate-500">My Cart</span>
                   <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                      ₵{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </span>
                </div>
             </Link>
          </div>
        </div>
        
        {/* 3. CATEGORY NAVIGATION BAR */}
        <div className="border-t border-slate-100 bg-slate-50/50 hidden md:block">
           <div className="max-w-7xl mx-auto px-4 lg:px-6 h-12 flex items-center gap-8">
              <button className="flex items-center gap-2 text-sm font-extrabold text-slate-900 hover:text-blue-600 uppercase tracking-wide">
                 <Menu className="h-4 w-4" /> All Categories
              </button>
               <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
                 <Link href="/shop" className="hover:text-blue-600 transition-colors">Best Sellers</Link>
                 {categories.slice(0, 5).map((category) => (
                    <Link 
                      key={category.id} 
                      href={`/categories/${category.slug}`} 
                      className="hover:text-blue-600 transition-colors capitalize"
                    >
                      {category.name}
                    </Link>
                 ))}
                 <Link href="/deals" className="text-red-500 font-bold hover:text-red-600 transition-colors">Today's Deals</Link>
               </nav>
           </div>
        </div>
      </header>
    </div>
  );
}
