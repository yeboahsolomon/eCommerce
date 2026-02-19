"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Wallet, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Store,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login?redirect=/seller/dashboard");
      } else if (user?.role !== "SELLER" && user?.role !== "ADMIN") {
        router.push("/seller/apply");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "SELLER" && user?.role !== "ADMIN")) {
    return null;
  }

  const navItems = [
    { name: "Overview", href: "/seller/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/seller/dashboard/products", icon: Package },
    { name: "Orders", href: "/seller/dashboard/orders", icon: ShoppingBag },
    { name: "Payouts", href: "/seller/dashboard/payouts", icon: Wallet },
    { name: "Settings", href: "/seller/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:overflow-y-auto",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
           <Link href="/" className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
             <span className="font-bold text-lg text-slate-900">Seller Hub</span>
           </Link>
        </div>

        <div className="p-4">
          <div className="mb-6 px-2">
             <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                   {user?.firstName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-sm font-bold text-slate-900 truncate">My Store</p>
                   <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
             </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors",
                    isActive 
                      ? "bg-blue-50 text-blue-600" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-400")} />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-8 border-t border-slate-100 px-4">
            <button 
               onClick={logout}
               className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            >
               <LogOut className="w-5 h-5" />
               Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:hidden">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                 <Menu className="w-6 h-6" />
              </button>
              <span className="font-bold text-slate-900">Dashboard</span>
           </div>
           <Link href="/" className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Store className="w-5 h-5" />
           </Link>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
           {children}
        </main>
      </div>
    </div>
  );
}
