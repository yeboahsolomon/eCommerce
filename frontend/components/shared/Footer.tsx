"use client";
import Link from "next/link";
import { 
  MapPin, Phone, Mail, Facebook, Twitter, Instagram, 
  Youtube, ShieldCheck, Truck, CreditCard, Smartphone,
  CheckCircle2, ArrowRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const FOOTER_LINKS = {
  shop: [
    { label: "Shop All Products", href: "/products" },
    { label: "Today's Deals", href: "/products?deals=true" },
    { label: "Track Order", href: "/account/orders" },
    { label: "Become a Seller", href: "/seller/register" },
  ],
  support: [
    { label: "Help Center", href: "/help" },
    { label: "Return Policy", href: "/returns" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
  categories: [
    { label: "Groceries & Foodstuff", href: "/category/groceries" },
    { label: "Farm Produce", href: "/category/farm-produce" },
    { label: "Electronics & Phones", href: "/category/electronics" },
    { label: "Fashion & Clothing", href: "/category/fashion" },
    { label: "Home & Kitchen", href: "/category/home-kitchen" },
    { label: "Beauty & Health", href: "/category/beauty" },
  ]
};

const PAYMENT_METHODS = [
  { name: "MTN MoMo", color: "bg-yellow-400 text-yellow-900" },
  { name: "Vodafone Cash", color: "bg-red-500 text-white" },
  { name: "Cash on Delivery", color: "bg-green-600 text-white" },
  { name: "Bank Transfer", color: "bg-slate-700 text-white" },
];

export default function Footer() {
  const { isAuthenticated } = useAuth();

  const { data: sellerApplication } = useQuery({
    queryKey: ['sellerApplication', isAuthenticated],
    queryFn: async () => {
        if (!isAuthenticated) return null;
        const res = await api.getMySellerApplication();
        return res.success && res.data?.application ? res.data.application : null;
    },
    enabled: isAuthenticated,
  });

  let shopLinks = FOOTER_LINKS.shop;
  if (!isAuthenticated) {
    shopLinks = shopLinks.filter(link => link.label !== "Become a Seller");
  } else if (sellerApplication) {
    shopLinks = shopLinks.map(link => 
      link.label === "Become a Seller" ? { label: "Status", href: "/seller/status" } : link
    );
  }

  return (
    <footer className="bg-gradient-to-br from-slate-900 to-blue-950 text-white mt-auto relative overflow-hidden">
      
      {/* Top Accent Strip - Ghana Flag Gradient */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" />

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Section 1: Brand & Local Identity (4 columns) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 text-white font-bold text-2xl">
                  G
                </div>
                <div>
                  <h3 className="text-xl font-bold leading-none tracking-tight text-white">GhanaMarket</h3>
                  <span className="text-xs text-blue-200 uppercase tracking-widest font-medium">Online Mall</span>
                </div>
              </div>
              
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 w-fit">
                <span className="text-xs font-semibold text-yellow-400 tracking-wide">PROUDLY GHANAIAN</span>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
                Your trusted local marketplace serving <span className="text-white font-semibold">Drobo</span>, <span className="text-white font-semibold">Jaman South</span>, and the entire <span className="text-white font-semibold">Bono Region</span>. We bring the market to your phone with ease and reliability.
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3 pt-2">
                {[
                  { icon: Facebook, href: "#", bg: "bg-[#1877F2]" },
                  { icon: Twitter, href: "#", bg: "bg-[#1DA1F2]" },
                  { icon: Instagram, href: "#", bg: "bg-[#E4405F]" },
                  { icon: Youtube, href: "#", bg: "bg-[#FF0000]" },
                ].map((social, idx) => (
                  <a
                    key={idx}
                    href={social.href}
                    className={`${social.bg} h-8 w-8 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-md`}
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Quick Links (2 columns) */}
          <div className="lg:col-span-2">
            <h4 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-6 relative inline-block after:content-[''] after:absolute after:left-0 after:-bottom-2 after:w-8 after:h-0.5 after:bg-red-500">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[...shopLinks, ...FOOTER_LINKS.support.slice(0, 2)].map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-slate-300 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1"
                  >
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Categories (2 columns) */}
          <div className="lg:col-span-2">
            <h4 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-6 relative inline-block after:content-[''] after:absolute after:left-0 after:-bottom-2 after:w-8 after:h-0.5 after:bg-red-500">
              Categories
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.categories.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-slate-300 hover:text-white hover:translate-x-1 transition-all inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 4: Contact & Newsletter (4 columns) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Contact Info */}
            <div>
              <h4 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-6 relative inline-block after:content-[''] after:absolute after:left-0 after:-bottom-2 after:w-8 after:h-0.5 after:bg-red-500">
                Contact Us
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-semibold block text-sm">Drobo Main Head Office</span>
                    <span className="text-slate-400 text-sm">Drobo Main Market Road, Jaman South, Bono Region</span>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-yellow-400 shrink-0" />
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <a href="tel:+233200000000" className="text-slate-300 hover:text-white text-sm">+233 20 000 0000</a>
                    <a href="tel:+233200000000" className="text-slate-300 hover:text-white text-sm">+233 24 000 0000</a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-5 w-5 flex items-center justify-center shrink-0">
                    <span className="text-yellow-400 text-lg">🕒</span>
                  </div>
                  <div className="text-sm text-slate-400">
                    <p>Mon - Sat: 7:00 AM - 8:00 PM</p>
                    <p>Sunday: 9:00 AM - 5:00 PM</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <h5 className="text-white font-semibold text-sm mb-2">Get Deals via SMS/WhatsApp</h5>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="tel" 
                    placeholder="0XX XXX XXXX" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 placeholder:text-slate-500"
                  />
                </div>
                <button className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 rounded-lg transition-colors">
                  Join
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Accepted Payment Methods</span>
              <div className="flex flex-wrap justify-center gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <div 
                    key={method.name} 
                    className={`${method.color} px-3 py-1 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1.5`}
                  >
                    {method.name.includes("MoMo") && <Smartphone className="h-3 w-3" />}
                    {method.name}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-slate-400 text-xs text-center md:text-right">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>Secure Shopping</span>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="h-4 w-4 text-blue-500" />
                <span>Fast Delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} GhanaMarket. Serving Jaman South with pride.
          </p>
          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
            <Link href="#" className="hover:text-yellow-400 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-yellow-400 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-yellow-400 transition-colors">Sitemap</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
