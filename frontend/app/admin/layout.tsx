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
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";

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
    <div className="fixed inset-0 z-[99999] bg-[#0B0F19] text-slate-300 flex font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Extracted Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        pendingApps={pendingApps}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0 flex flex-col relative z-10">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Extracted Topbar */}
        <Topbar setIsMobileMenuOpen={setIsMobileMenuOpen} pendingAlertsCount={pendingApps} />

        {/* Page content */}
        <div className="p-4 md:p-6 pb-20 md:pb-6">{children}</div>
      </main>
    </div>
  );
}
