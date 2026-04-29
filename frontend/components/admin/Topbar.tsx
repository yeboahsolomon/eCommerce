"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, Search, Bell, User, Key, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Breadcrumb/Title map
const titleMap: Record<string, string> = {
  admin: "Dashboard",
  applications: "Seller Applications",
  sellers: "Sellers",
  orders: "Orders",
  products: "Products",
  users: "Users",
  payouts: "Transactions",
  disputes: "Disputes",
  announcements: "Announcements",
  "audit-logs": "Audit Logs",
  analytics: "Analytics",
  settings: "Settings",
};

interface TopbarProps {
  setIsMobileMenuOpen: (val: boolean) => void;
  pendingAlertsCount?: number;
}

export default function Topbar({ setIsMobileMenuOpen, pendingAlertsCount = 0 }: TopbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine current page title
  const pathSegments = pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1];
  const pageTitle = titleMap[lastSegment] || lastSegment || "Dashboard";

  return (
    <header className="bg-[#0f1117] px-4 md:px-8 py-4 sticky top-0 z-30 border-b border-slate-800">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-semibold text-white capitalize hidden sm:block">
            {pageTitle}
          </h2>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-xl hidden md:block px-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-green-400 transition-colors" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
            />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4 flex-shrink-0">
          
          {/* Notification Bell */}
          <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800">
            <Bell className="h-5 w-5" />
            {pendingAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-[#0f1117]"></span>
            )}
          </button>

          {/* SUPERADMIN Badge */}
          {user?.role === "SUPERADMIN" && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 tracking-wide">
              SUPERADMIN
            </span>
          )}

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="h-9 w-9 bg-gradient-to-br from-green-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border border-slate-700 hover:border-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-[#0f1117]"
            >
              {user?.firstName?.[0] || "A"}
              {user?.lastName?.[0] || "P"}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors">
                  <User className="h-4 w-4" /> My Profile
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors">
                  <Key className="h-4 w-4" /> Change Password
                </button>
                <div className="border-t border-slate-800 my-1"></div>
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
