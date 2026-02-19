"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Store, TrendingUp, CreditCard, Headphones, ShieldCheck, 
  BarChart3, Package, Users, ChevronRight, CheckCircle, Loader2
} from "lucide-react";

const SELLER_BENEFITS = [
  {
    icon: Users,
    title: "Reach Millions",
    description: "Access customers across all 16 regions of Ghana, from Accra to Tamale.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: CreditCard,
    title: "Instant MoMo Payouts",
    description: "Get paid directly to your MTN MoMo, Vodafone Cash, or bank account.",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: BarChart3,
    title: "Free Seller Dashboard",
    description: "Track orders, inventory, sales analytics, and customer insights all in one place.",
    color: "bg-violet-100 text-violet-600",
  },
  {
    icon: ShieldCheck,
    title: "Seller Protection",
    description: "Fraud protection, dispute resolution, and dedicated seller support.",
    color: "bg-amber-100 text-amber-600",
  },
  {
    icon: Package,
    title: "Easy Shipping",
    description: "We handle nationwide logistics so you can focus on your products.",
    color: "bg-pink-100 text-pink-600",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Dedicated seller support team to help you grow your business.",
    color: "bg-cyan-100 text-cyan-600",
  },
];

const STEPS = [
  { step: "1", title: "Create your seller account", description: "Fill in your business details. It only takes 2 minutes." },
  { step: "2", title: "List your first product", description: "Upload photos, set prices, and describe your products." },
  { step: "3", title: "Start earning", description: "Receive orders and get paid directly to your mobile money." },
];

export default function SellerRegisterPage() {
  const { isAuthenticated } = useAuth();


  return (
    <div className="min-h-screen pb-20 md:pb-12">

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-16 md:py-24 px-4">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-emerald-300 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-white/10">
            <Store className="h-3.5 w-3.5" />
            <span>JOIN 5,000+ SELLERS ON GHANAMARKET</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Turn Your Products Into
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              a Thriving Business
            </span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Whether you sell electronics, fashion, food, or crafts — GhanaMarket connects you 
            with buyers across all 16 regions. No setup fees, instant payouts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            {["No listing fees", "Instant MoMo payouts", "Nationwide delivery"].map((perk) => (
              <div key={perk} className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle className="h-4 w-4" />
                <span>{perk}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-12">
          <h2 className="text-center text-2xl font-bold text-slate-900 mb-8">Start Selling in 3 Easy Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((item, i) => (
              <div key={item.step} className="text-center relative">
                <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-extrabold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.description}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-7 -right-4 h-6 w-6 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <section className="mb-12">
          <h2 className="text-center text-2xl font-bold text-slate-900 mb-3">Why Sell on GhanaMarket?</h2>
          <p className="text-center text-slate-500 mb-8 max-w-xl mx-auto">Everything you need to grow your business online.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SELLER_BENEFITS.map((benefit) => (
              <div key={benefit.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all group">
                <div className={`h-12 w-12 rounded-xl ${benefit.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ready to Apply CTA */}
        <section className="max-w-3xl mx-auto text-center bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 p-12 relative overflow-hidden" id="apply">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3"></div>
          
          <div className="inline-flex items-center justify-center p-4 bg-blue-50 text-blue-600 rounded-2xl mb-6">
            <Store className="w-8 h-8" />
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to Grow Your Business?</h2>
          <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
            Join thousands of successful sellers on GhanaMarket today. Setup takes less than 5 minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/seller/apply" 
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
            >
              Start Seller Application <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            {!isAuthenticated && (
              <p className="text-sm text-slate-500 mt-4 sm:mt-0">
                Already started? <Link href="/auth/login?redirect=/seller/apply" className="text-blue-600 font-bold hover:underline">Log in to continue</Link>
              </p>
            )}
          </div>
          
          <p className="mt-8 text-xs text-slate-400">
            By applying, you agree to our <Link href="/terms" className="text-blue-600 hover:underline">Seller Terms</Link> and <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
          </p>
        </section>

        {/* Stats */}
        <section className="mt-12 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            {[
              { value: "5,000+", label: "Active Sellers" },
              { value: "₵2M+", label: "Monthly Sales" },
              { value: "16", label: "Regions Covered" },
              { value: "50K+", label: "Happy Customers" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl md:text-4xl font-extrabold">{stat.value}</p>
                <p className="text-sm text-blue-200 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
