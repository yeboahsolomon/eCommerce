"use client";
import Link from "next/link";
import { 
  MapPin, Phone, Mail, Facebook, Twitter, Instagram, 
  Youtube, ShieldCheck, Truck, CreditCard, Headphones 
} from "lucide-react";

const FOOTER_LINKS = {
  shop: [
    { label: "All Products", href: "/products" },
    { label: "Electronics", href: "/category/electronics" },
    { label: "Fashion", href: "/category/fashion" },
    { label: "Food & Groceries", href: "/category/food-groceries" },
    { label: "Home & Kitchen", href: "/category/home-kitchen" },
    { label: "Today's Deals", href: "/products?deals=true" },
  ],
  customerService: [
    { label: "Help Center", href: "/help" },
    { label: "Track Your Order", href: "/account/orders" },
    { label: "Returns & Refunds", href: "/returns" },
    { label: "Shipping Info", href: "/shipping" },
    { label: "Contact Us", href: "/contact" },
  ],
  about: [
    { label: "About GhanaMarket", href: "/about" },
    { label: "Become a Seller", href: "/seller/register" },
    { label: "Careers", href: "/careers" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const PAYMENT_METHODS = [
  { name: "MTN MoMo", color: "bg-yellow-400 text-yellow-900" },
  { name: "Vodafone Cash", color: "bg-red-500 text-white" },
  { name: "AirtelTigo", color: "bg-blue-500 text-white" },
  { name: "Visa", color: "bg-blue-700 text-white" },
  { name: "Mastercard", color: "bg-orange-500 text-white" },
];

const DELIVERY_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Northern", "Volta", "Bono", "Ahafo", "Upper East",
  "Upper West", "Savannah", "North East", "Bono East",
  "Oti", "Western North",
];

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white mt-auto hidden md:block">
      
      {/* Top Strip — Value Propositions */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <Truck className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Nationwide Delivery</p>
                <p className="text-xs text-slate-400">All 16 regions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Secure Payments</p>
                <p className="text-xs text-slate-400">MoMo & Card</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Best Prices</p>
                <p className="text-xs text-slate-400">Price match guarantee</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <Headphones className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">24/7 Support</p>
                <p className="text-xs text-slate-400">We&apos;re here to help</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <span className="text-white font-bold text-2xl">G</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-xl tracking-tight">GhanaMarket</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Online Mall</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
              Ghana&apos;s premier online marketplace. Buy and sell anything — from electronics to fresh food. Secure 
              payments via MTN MoMo, Vodafone Cash, and card.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2">
              <a href="tel:+233200000000" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                <Phone className="h-4 w-4" /> +233 20 000 0000
              </a>
              <a href="mailto:hello@ghanamarket.com" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                <Mail className="h-4 w-4" /> hello@ghanamarket.com
              </a>
              <p className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4" /> Accra, Ghana
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 mt-6">
              {[
                { icon: Facebook, href: "#", label: "Facebook" },
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Instagram, href: "#", label: "Instagram" },
                { icon: Youtube, href: "#", label: "YouTube" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="h-9 w-9 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.shop.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4">Customer Service</h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.customerService.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.about.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Methods & Delivery */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Payment Methods */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-slate-300">Accepted Payment Methods</h4>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <span
                    key={method.name}
                    className={`${method.color} text-[11px] font-bold px-3 py-1.5 rounded-md`}
                  >
                    {method.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Delivery Regions */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-slate-300">We Deliver To</h4>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {DELIVERY_REGIONS.map((region, i) => (
                  <span key={region} className="text-xs text-slate-500">
                    {region}{i < DELIVERY_REGIONS.length - 1 && " •"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} GhanaMarket. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
