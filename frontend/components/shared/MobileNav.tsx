"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/categories", label: "Cat", icon: LayoutGrid },
    { href: "/cart", label: "Cart", icon: ShoppingCart },
    { href: "/account", label: "Me", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-slate-200 md:hidden pb-safe">
      <div className="grid h-full grid-cols-4 mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 hover:bg-slate-50 group",
                isActive ? "text-blue-600" : "text-slate-500"
              )}
            >
              <item.icon
                className={cn(
                  "w-6 h-6 mb-1 transition-colors group-hover:text-blue-600",
                  isActive && "fill-current"
                )}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
