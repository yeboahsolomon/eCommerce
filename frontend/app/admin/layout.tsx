"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Store,
  ChevronRight,
  ChevronLeft,
  FileText,
  ShoppingBag,
  Bell,
  Menu,
  Activity,
  BarChart3,
  Wallet,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: FileText, badge: true },
  { href: "/admin/sellers", label: "Sellers", icon: ShoppingBag },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: Activity },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

// Breadcrumb label map
const breadcrumbMap: Record<string, string> = {
  admin: "Admin",
  applications: "Seller Applications",
  sellers: "Sellers",
  orders: "Orders",
  products: "Products",
  users: "Users",
  payouts: "Payouts",
  "audit-logs": "Audit Logs",
  analytics: "Analytics",
  settings: "Settings",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingApps, setPendingApps] = useState(0);

  // Allow access to login/register pages without auth
  const isAuthPage = pathname === "/admin/login" || pathname === "/admin/register";

  useEffect(() => {
    if (!isLoading && !isAuthPage) {
      if (!isAuthenticated) {
        router.push("/admin/login");
      } else if (user?.role !== "SUPERADMIN") {
        router.push("/admin/login");
      }
    }
  }, [isLoading, isAuthenticated, user, router, isAuthPage]);

  // Fetch pending application count
  useEffect(() => {
    if (isAuthenticated && user?.role === "SUPERADMIN") {
      api.getAdminDashboard().then((res) => {
        if (res.success && res.data?.sellers?.pendingApplications) {
          setPendingApps(res.data.sellers.pendingApplications);
        }
      }).catch(() => {});
    }
  }, [isAuthenticated, user]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Show auth pages without layout
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Not authorized
  if (!isAuthenticated || user?.role !== "SUPERADMIN") {
    return null;
  }

  // Build breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, idx) => ({
    label: breadcrumbMap[segment] || segment,
    href: "/" + pathSegments.slice(0, idx + 1).join("/"),
    isLast: idx === pathSegments.length - 1,
  }));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 flex font-sans selection:bg-blue-500/30">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Floating & Glassmorphic */}
      <aside
        className={`${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed inset-y-0 left-0 z-50 md:relative md:z-20 ${
          collapsed ? "w-[80px]" : "w-72"
        } h-full md:h-auto m-0 md:m-4 md:mr-0 rounded-none md:rounded-3xl bg-slate-900/90 md:bg-slate-900/50 backdrop-blur-xl border-r md:border border-slate-800/60 flex flex-col transition-all duration-400 ease-in-out flex-shrink-0 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden`}
      >
        {/* Subtle top gradient line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/60 flex items-center justify-between min-h-[88px]">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300 transform group-hover:scale-105">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base tracking-tight">Ghana Market</h1>
                <p className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold mt-0.5">Admin Portal</p>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          {sidebarLinks.map((link) => {
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group ${
                  isActive
                    ? "text-white bg-blue-600/10"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                } ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? link.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                )}
                <link.icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-300 ${isActive ? "text-blue-500" : "text-slate-500 group-hover:text-slate-300"}`} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{link.label}</span>
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

        {/* User section */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/30">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg border border-white/10">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/admin/login");
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={async () => {
                await logout();
                router.push("/admin/login");
              }}
              className="w-full p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition flex justify-center"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0 flex flex-col relative z-10">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Top bar with breadcrumbs */}
        <header className="bg-transparent px-4 md:px-8 py-4 md:py-6 sticky top-0 z-30 backdrop-blur-sm border-b border-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <button
                className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center text-sm text-slate-500 font-medium overflow-x-auto whitespace-nowrap scrollbar-hide">
                {breadcrumbs.map((crumb, idx) => (
                  <span key={crumb.href} className="flex items-center">
                    {idx > 0 && <ChevronRight className="h-4 w-4 mx-1.5 text-slate-700 flex-shrink-0" />}
                    {crumb.isLast ? (
                      <span className="text-slate-200 font-medium truncate">{crumb.label}</span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="hover:text-white transition truncate"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="text-xs text-slate-500 hover:text-white transition flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-700"
              >
                <Store className="h-3.5 w-3.5" />
                View Store
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6 pb-20 md:pb-6">{children}</div>
      </main>
    </div>
  );
}
