"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, User, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

export default function MobileNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  const navItems: { href: string; label: string; icon: any; badge?: number }[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/products", label: "Shop", icon: LayoutGrid },
    { href: "/cart", label: "Cart", icon: ShoppingCart, badge: itemCount },
    { href: "/account/wishlist", label: "Wishlist", icon: Heart },
    { href: "/account", label: "Account", icon: User },
  ];

  // Hide on dashboard/admin/seller/checkout/auth pages
  const hiddenPaths = ['/admin', '/seller', '/checkout', '/auth'];
  if (hiddenPaths.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-[60px] bg-white border-t border-slate-200 md:hidden pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="grid h-full grid-cols-5 mx-auto max-w-md">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full transition-colors group",
                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    "w-5 h-5 mb-1 transition-transform duration-200",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )}
                  fill={isActive && item.label !== "Cart" ? "currentColor" : "none"}
                />
                {item.badge != null && item.badge > 0 && (
                   <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white px-0.5">
                      {item.badge > 99 ? '99+' : item.badge}
                   </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium leading-none", isActive ? "font-bold" : "")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
