"use client";

import ProductCard from "@/components/ui/ProductCard";
import CategoryCard from "@/components/ui/CategoryCard";
import CountdownTimer from "@/components/ui/CountdownTimer";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PRODUCTS } from "@/lib/dummy-data";
import { Product, Category } from "@/types";
import Link from "next/link";
import { 
  Loader2, ArrowRight, ShieldCheck, Truck, BadgePercent, 
  RotateCcw, Zap, ChevronRight, Store, Flame
} from "lucide-react";
import { useEffect, useState } from "react";
import HeroCarousel from "@/components/shared/hero/HeroCarousel";
import Greeting from "@/components/shared/hero/Greeting";
import TrustBadges from "@/components/shared/hero/TrustBadges";
import DealOfTheDay from "@/components/shared/hero/DealOfTheDay";



export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products and categories in parallel
        const [productsRes, categoriesRes] = await Promise.allSettled([
          api.getProducts({ limit: 8, sortBy: 'createdAt', order: 'desc' }),
          api.getCategories(),
        ]);

        // Products
        if (productsRes.status === "fulfilled") {
           console.log("Homepage: Products API Result:", productsRes.value);
           if (productsRes.value.success && productsRes.value.data?.products) {
             console.log("Homepage: Setting Real Products", productsRes.value.data.products);
             setProducts(productsRes.value.data.products as Product[]);
           } else {
             console.warn("Homepage: API success false or no data, using fallback");
             setProducts(PRODUCTS.filter(p => p.isFeatured).slice(0, 8));
           }
        } else {
           console.error("Homepage: Products API request failed", productsRes.reason);
           setProducts(PRODUCTS.filter(p => p.isFeatured).slice(0, 8));
        }

          // Categories
        if (categoriesRes.status === "fulfilled" && categoriesRes.value.success && categoriesRes.value.data?.categories) {
          setCategories(categoriesRes.value.data.categories as Category[]);
        } else {
          setCategories([] as Category[]);
        }
      } catch (err) {
        console.error("Homepage: Fetch error", err);
        setProducts(PRODUCTS.filter(p => p.isFeatured).slice(0, 8));
        setCategories([] as Category[]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-12 md:space-y-16 pb-12">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HERO SECTION                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NEW HERO SECTION                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4 md:space-y-6">
        <Greeting />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Carousel - 12 cols on mobile, 8 or 9 on desktop */}
          <div className="lg:col-span-8 xl:col-span-9">
            <HeroCarousel />
          </div>
          
          {/* Desktop Side Banner */}
          <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-4">
             <DealOfTheDay />
          </div>
        </div>

        <div className="space-y-6">
          <TrustBadges />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CATEGORY SHOWCASE                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Shop by Category</h2>
            <p className="text-slate-500 text-sm mt-1">Find exactly what you need</p>
          </div>
          <Link 
            href="/products" 
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            All Categories <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.slice(0, 12).map((cat, i) => (
            <CategoryCard 
              key={cat.id} 
              name={cat.name} 
              slug={cat.slug} 
              productCount={(cat as any).productCount}
              index={i} 
            />
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FLASH DEALS BANNER                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJIMjR2LTJoMTJ6TTM2IDI0djJIMjR2LTJoMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Flame className="h-7 w-7 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">Flash Deals</h3>
                <span className="bg-yellow-400 text-yellow-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">Live</span>
              </div>
              <p className="text-white/80 text-sm mt-1">Massive discounts ending soon — don&apos;t miss out!</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-white/60 text-xs font-medium mb-2 uppercase tracking-wider">Ends In</p>
              <CountdownTimer hoursFromNow={8} />
            </div>
            <Link 
              href="/products?deals=true"
              className="bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-lg flex-shrink-0 active:scale-[0.98]"
            >
              Shop Deals
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FEATURED PRODUCTS GRID                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Fresh from the Market</h2>
            <p className="text-slate-500 text-sm mt-1">Newest arrivals from our sellers</p>
          </div>
          <Link 
            href="/products" 
            className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {products.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-500">
                No featured products available at the moment.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* WHY GHANAMARKET — TRUST SECTION                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 rounded-3xl p-8 sm:p-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Why Shop on GhanaMarket?</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Trusted by thousands of Ghanaians for safe, fast, and affordable online shopping.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Truck,
              title: "Fast Delivery",
              description: "Same-day delivery in Accra. 2-5 days nationwide to all 16 regions of Ghana.",
              color: "bg-blue-100 text-blue-600",
            },
            {
              icon: ShieldCheck,
              title: "Secure MoMo Payments",
              description: "Pay safely with MTN MoMo, Vodafone Cash, AirtelTigo Money, or card.",
              color: "bg-green-100 text-green-600",
            },
            {
              icon: BadgePercent,
              title: "Best Prices",
              description: "Compare prices from thousands of sellers. We guarantee the best deals in Ghana.",
              color: "bg-amber-100 text-amber-600",
            },
            {
              icon: RotateCcw,
              title: "Easy Returns",
              description: "Changed your mind? Free returns within 7 days. No questions asked.",
              color: "bg-purple-100 text-purple-600",
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 text-center group">
              <div className={`h-14 w-14 rounded-2xl ${feature.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BECOME A SELLER CTA                                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-12">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"></div>
        
        <div className={`relative z-10 flex flex-col items-center gap-8 ${isAuthenticated && !authLoading ? 'md:flex-row md:justify-between md:text-left' : 'justify-center text-center'}`}>
          <div className={`${isAuthenticated && !authLoading ? 'max-w-lg' : 'max-w-3xl'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
              Start Selling on GhanaMarket Today
            </h2>
            <p className="text-slate-300 text-lg mb-6 leading-relaxed">
              Join thousands of sellers reaching customers across Ghana. 
              From food to electronics — sell anything, anywhere.
            </p>
            <div className={`flex flex-wrap gap-x-6 gap-y-3 text-sm ${isAuthenticated && !authLoading ? '' : 'justify-center'}`}>
              {["No listing fees", "Instant MoMo payouts", "Free seller dashboard"].map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-medium">{perk}</span>
                </div>
              ))}
            </div>
          </div>
          {isAuthenticated && !authLoading && (
            <Link 
              href="/seller/register"
              className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-slate-100 transition-all shadow-xl flex-shrink-0 active:scale-[0.98]"
            >
              Become a Seller
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
