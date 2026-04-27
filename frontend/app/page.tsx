"use client";

import ProductCard from "@/components/ui/ProductCard";
import ProductCarousel from "@/components/ui/ProductCarousel";
import CategoryProductRow from "@/components/ui/CategoryProductRow";
import CategoryCard from "@/components/ui/CategoryCard";
import CountdownTimer from "@/components/ui/CountdownTimer";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Product, Category, HomepageFeeds } from "@/types";
import Link from "next/link";
import {
  ShieldCheck, Truck, BadgePercent,
  RotateCcw, ChevronRight, Flame,
  TrendingUp, Trophy, Tag, Sparkles, Star,
} from "lucide-react";
import { PLATFORM_FEATURES, SELLER_PERKS } from "@/lib/constants";
import HeroCarousel from "@/components/shared/hero/HeroCarousel";
import Greeting from "@/components/shared/hero/Greeting";
import DealOfTheDay from "@/components/shared/hero/DealOfTheDay";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ── Fetch all homepage recommendation feeds in one call ──
  const { data: feedsData, isLoading: feedsLoading } = useQuery({
    queryKey: ["homepage-feeds"],
    queryFn: async () => {
      const res = await api.getHomepageFeeds();
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });

  // ── Fetch Categories ──
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.getCategories();
      if (res.success && res.data?.categories) {
        return res.data.categories;
      }
      return [];
    },
  });

  const { data: sellerApplication } = useQuery({
    queryKey: ["sellerApplication", isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const res = await api.getMySellerApplication();
      return res.success && res.data?.application
        ? res.data.application
        : null;
    },
    enabled: isAuthenticated,
  });

  const feeds = feedsData || null;
  const categories = categoriesData || [];

  return (
    <div className="space-y-10 md:space-y-14 pb-12">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HERO SECTION                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4 md:space-y-6">
        <Greeting />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Carousel */}
          <div className="lg:col-span-8 xl:col-span-9">
            <HeroCarousel appendMobileSlide={<DealOfTheDay />} />
          </div>

          {/* Desktop Side Banner */}
          <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col h-full">
            <DealOfTheDay />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 🔥 TRENDING NOW                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ProductCarousel
        title="Trending Now"
        subtitle="Hot products people are loving right now"
        icon={TrendingUp}
        iconColor="text-orange-600"
        iconBg="bg-orange-50"
        accentGradient="from-orange-500 to-red-500"
        products={feeds?.trending || []}
        isLoading={feedsLoading}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CATEGORY SHOWCASE                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="hidden sm:flex h-10 w-10 rounded-xl bg-indigo-50 items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Shop by Category
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Find exactly what you need
            </p>
            <div className="h-0.5 w-12 mt-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-60" />
          </div>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-slate-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
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
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FLASH DEALS BANNER                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 p-6 sm:p-8 shadow-xl shadow-red-600/10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJIMjR2LTJoMTJ6TTM2IDI0djJIMjR2LTJoMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30 animate-pulse"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Flame className="h-7 w-7 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Flash Deals
                </h3>
                <span className="bg-yellow-400 text-yellow-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase animate-pulse">
                  Live
                </span>
              </div>
              <p className="text-white/80 text-sm mt-1">
                Massive discounts ending soon — don&apos;t miss out!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center hidden sm:block">
              <p className="text-white/60 text-xs font-medium mb-2 uppercase tracking-wider">
                Ends In
              </p>
              <CountdownTimer hoursFromNow={8} />
            </div>
            <Link
              href="/products?deals=true"
              className="bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex-shrink-0"
            >
              Shop Deals
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 💰 TOP DEALS                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ProductCarousel
        title="Top Deals"
        subtitle="Biggest discounts across all categories"
        icon={Tag}
        iconColor="text-rose-600"
        iconBg="bg-rose-50"
        accentGradient="from-rose-500 to-pink-500"
        products={feeds?.topDeals || []}
        isLoading={feedsLoading}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 🏆 BEST SELLERS                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ProductCarousel
        title="Best Sellers"
        subtitle="Most purchased products on GhanaMarket"
        icon={Trophy}
        iconColor="text-amber-600"
        iconBg="bg-amber-50"
        accentGradient="from-amber-500 to-yellow-500"
        products={feeds?.bestSellers || []}
        isLoading={feedsLoading}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ⭐ TOP RATED                                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ProductCarousel
        title="Top Rated"
        subtitle="Highest rated by verified buyers"
        icon={Star}
        iconColor="text-yellow-500"
        iconBg="bg-yellow-50"
        accentGradient="from-yellow-400 to-amber-500"
        products={feeds?.topRated || []}
        isLoading={feedsLoading}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 🆕 NEW ARRIVALS                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ProductCarousel
        title="New Arrivals"
        subtitle="Freshly listed products from our sellers"
        icon={Sparkles}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-50"
        accentGradient="from-emerald-500 to-teal-500"
        products={feeds?.newArrivals || []}
        isLoading={feedsLoading}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 📦 CATEGORY PICKS                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {feeds?.categoryPicks && feeds.categoryPicks.length > 0 && (
        <div className="space-y-10 md:space-y-14">
          {feeds.categoryPicks.map((pick) =>
            pick && pick.products.length > 0 ? (
              <CategoryProductRow
                key={pick.category.id}
                category={pick.category}
                products={pick.products}
              />
            ) : null
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* WHY GHANAMARKET — TRUST SECTION                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 rounded-3xl p-8 sm:p-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            Why Shop on GhanaMarket?
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Trusted by thousands of Ghanaians for safe, fast, and affordable
            online shopping.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLATFORM_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-xl hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 text-center group cursor-default"
            >
              <div
                className={`h-14 w-14 rounded-2xl ${feature.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm`}
              >
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BECOME A SELLER CTA                                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-12 shadow-2xl shadow-slate-900/20">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"></div>

        <div
          className={`relative z-10 flex flex-col items-center gap-8 ${
            isAuthenticated && !authLoading
              ? "md:flex-row md:justify-between md:text-left"
              : "justify-center text-center"
          }`}
        >
          <div
            className={`${
              isAuthenticated && !authLoading ? "max-w-lg" : "max-w-3xl"
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
              Start Selling on GhanaMarket Today
            </h2>
            <p className="text-slate-300 text-lg mb-6 leading-relaxed">
              Join thousands of sellers reaching customers across Ghana. From
              food to electronics — sell anything, anywhere.
            </p>
            <div
              className={`flex flex-wrap gap-x-6 gap-y-3 text-sm ${
                isAuthenticated && !authLoading ? "" : "justify-center"
              }`}
            >
              {SELLER_PERKS.map((perk) => (
                <div
                  key={perk}
                  className="flex items-center gap-2 text-emerald-400"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-medium">{perk}</span>
                </div>
              ))}
            </div>
          </div>
          {isAuthenticated && !authLoading && (
            <Link
              href={
                sellerApplication ? "/seller/status" : "/seller/register"
              }
              className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-slate-100 transition-all shadow-xl flex-shrink-0 active:scale-[0.98] hover:scale-105"
            >
              {sellerApplication ? "Seller Status" : "Become a Seller"}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
