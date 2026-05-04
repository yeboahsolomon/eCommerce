"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Store,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  AlertTriangle,
  Megaphone,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: FileText, badge: true },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  pendingApps: number;
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  pendingApps,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAdminAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <aside
      className={`${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 fixed inset-y-0 left-0 z-50 md:relative md:z-20 ${
        collapsed ? "w-[80px]" : "w-72"
      } h-full bg-[#0f1117] flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] overflow-hidden`}
    >
      {/* Logo & Toggle */}
      <div className="p-5 flex items-center justify-between min-h-[88px]">
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20 group-hover:scale-105 transition-transform duration-300">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-white text-base tracking-tight whitespace-nowrap">
                GhanaMarket
              </h1>
              <p className="text-[10px] text-green-400 uppercase tracking-widest font-semibold mt-0.5 whitespace-nowrap">
                Admin Portal
              </p>
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200 flex-shrink-0 ${
            collapsed ? "mx-auto" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {sidebarLinks.map((link) => {
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 group ${
                isActive
                  ? "text-white bg-slate-800 border-l-4 border-green-400 rounded-l-none"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white border-l-4 border-transparent rounded-l-none"
              } ${collapsed ? "justify-center border-l-0 rounded-lg px-2" : ""}`}
              title={collapsed ? link.label : undefined}
            >
              <link.icon
                className={`h-5 w-5 flex-shrink-0 transition-colors duration-300 ${
                  isActive ? "text-green-400" : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 whitespace-nowrap">{link.label}</span>
                  {link.badge && pendingApps > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                      {pendingApps > 99 ? "99+" : pendingApps}
                    </span>
                  )}
                </>
              )}
              {collapsed && link.badge && pendingApps > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 rounded-full h-2 w-2" />
              )}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
