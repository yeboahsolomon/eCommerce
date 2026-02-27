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
  BarChart3,
  Bell,
  Menu,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: FileText, badge: true },
  { href: "/admin/sellers", label: "Sellers", icon: ShoppingBag },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/users", label: "Users", icon: Users },
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
  const [pendingApps, setPendingApps] = useState(0);

  // Allow access to login/register pages without auth
  const isAuthPage = pathname === "/admin/login" || pathname === "/admin/register";

  useEffect(() => {
    if (!isLoading && !isAuthPage) {
      if (!isAuthenticated) {
        router.push("/admin/login");
      } else if (user?.role !== "ADMIN") {
        router.push("/admin/login");
      }
    }
  }, [isLoading, isAuthenticated, user, router, isAuthPage]);

  // Fetch pending application count
  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      api.getAdminDashboard().then((res) => {
        if (res.success && res.data?.sellers?.pendingApplications) {
          setPendingApps(res.data.sellers.pendingApplications);
        }
      }).catch(() => {});
    }
  }, [isAuthenticated, user]);

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
  if (!isAuthenticated || user?.role !== "ADMIN") {
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
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-[72px]" : "w-64"
        } bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between min-h-[72px]">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-sm">Ghana Market</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Admin Portal</p>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition flex-shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-white border border-transparent"
                } ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? link.label : undefined}
              >
                <link.icon className="h-5 w-5 flex-shrink-0" />
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
        <div className="p-3 border-t border-slate-700">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-2 px-2">
                <div className="h-9 w-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
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
      <main className="flex-1 overflow-auto min-w-0">
        {/* Top bar with breadcrumbs */}
        <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 px-6 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-slate-400">
              {breadcrumbs.map((crumb, idx) => (
                <span key={crumb.href} className="flex items-center">
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-slate-600" />}
                  {crumb.isLast ? (
                    <span className="text-slate-200 font-medium">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-white transition"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
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
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
