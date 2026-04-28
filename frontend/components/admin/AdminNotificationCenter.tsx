"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  Bell,
  X,
  AlertTriangle,
  Clock,
  FileText,
  ShoppingCart,
  Wallet,
  Package,
  UserPlus,
  ShieldAlert,
  CreditCard,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

interface AdminAlert {
  id: string;
  type: string;
  severity: "critical" | "attention" | "info";
  title: string;
  message: string;
  count: number;
  link: string;
  icon: string;
}

interface AlertsData {
  critical: AdminAlert[];
  attention: AdminAlert[];
  info: AdminAlert[];
  totalCount: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  CreditCard,
  ShieldAlert,
  FileText,
  PackageMinus: Package,
  Wallet,
  Clock,
  AlertTriangle,
  ShoppingCart,
  UserPlus,
};

const SEVERITY_STYLES = {
  critical: {
    dot: "bg-red-500",
    bg: "bg-red-500/10 hover:bg-red-500/15",
    border: "border-red-500/20",
    icon: "text-red-400",
    badge: "bg-red-500/20 text-red-400",
    label: "Critical",
    labelColor: "text-red-400",
  },
  attention: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 hover:bg-amber-500/15",
    border: "border-amber-500/20",
    icon: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-400",
    label: "Needs Attention",
    labelColor: "text-amber-400",
  },
  info: {
    dot: "bg-blue-500",
    bg: "bg-blue-500/10 hover:bg-blue-500/15",
    border: "border-blue-500/20",
    icon: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-400",
    label: "Today",
    labelColor: "text-blue-400",
  },
};

// Polling interval: 60 seconds
const POLL_INTERVAL = 60_000;

export default function AdminNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch badge count (lightweight — runs on interval)
  const fetchBadgeCount = useCallback(async () => {
    try {
      const res = await api.getAdminAlertCount();
      if (res.success && res.data) {
        setBadgeCount(res.data.count);
      }
    } catch {
      // Silent fail for badge count polling
    }
  }, []);

  // Fetch full alerts (runs when dropdown opens)
  const fetchAlerts = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await api.getAdminAlerts();
      if (res.success && res.data) {
        setAlerts(res.data);
        setBadgeCount(res.data.totalCount);
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Poll badge count every 60s
  useEffect(() => {
    fetchBadgeCount();
    const interval = setInterval(fetchBadgeCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchBadgeCount]);

  // Fetch full alerts when dropdown opens
  useEffect(() => {
    if (isOpen && !alerts) {
      fetchAlerts();
    }
  }, [isOpen, alerts, fetchAlerts]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [isOpen]);

  const renderAlertGroup = (items: AdminAlert[], severity: "critical" | "attention" | "info") => {
    if (items.length === 0) return null;
    const style = SEVERITY_STYLES[severity];

    return (
      <div className="mb-1">
        {/* Group header */}
        <div className="flex items-center gap-2 px-4 py-2">
          <div className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.labelColor}`}>
            {style.label}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.badge}`}>
            {items.length}
          </span>
        </div>

        {/* Alert items */}
        {items.map((alert) => {
          const IconComponent = ICON_MAP[alert.icon] || AlertTriangle;
          return (
            <Link
              key={alert.id}
              href={alert.link}
              onClick={() => setIsOpen(false)}
              className={`flex items-start gap-3 px-4 py-2.5 border-l-2 ${style.border} ${style.bg} transition-colors group mx-1 rounded-r-lg mb-0.5`}
            >
              <div className={`flex-shrink-0 mt-0.5 ${style.icon}`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-tight">{alert.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{alert.message}</p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-1.5">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${style.badge}`}>
                  {alert.count}
                </span>
                <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  const hasAlerts = alerts && (alerts.critical.length > 0 || alerts.attention.length > 0 || alerts.info.length > 0);
  const hasCritical = badgeCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchAlerts();
        }}
        className={`relative p-2 rounded-lg transition-all ${
          isOpen
            ? "bg-slate-700 text-white"
            : "text-slate-400 hover:text-white hover:bg-slate-700/50"
        }`}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />

        {/* Badge */}
        {badgeCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full text-white ${
            hasCritical ? "bg-red-500 animate-pulse" : "bg-amber-500"
          }`}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/30 z-50 overflow-hidden"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {badgeCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  {badgeCount} action{badgeCount !== 1 ? "s" : ""} needed
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchAlerts(true)}
                disabled={isRefreshing}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : hasAlerts ? (
              <div className="py-1">
                {renderAlertGroup(alerts!.critical, "critical")}
                {renderAlertGroup(alerts!.attention, "attention")}
                {renderAlertGroup(alerts!.info, "info")}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">All clear!</p>
                <p className="text-xs text-slate-500 mt-1">No items need your attention right now.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {hasAlerts && (
            <div className="border-t border-slate-700/50 px-4 py-2.5 bg-slate-800/50">
              <p className="text-[10px] text-slate-500 text-center">
                Alerts refresh automatically every 60 seconds
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
