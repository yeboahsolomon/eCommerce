"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Order, Address } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  UserCircle, LogIn, Package, MapPin, Heart, Settings,
  ChevronRight, Loader2, ShoppingBag, Star, Clock, Truck, CheckCircle2
} from "lucide-react";

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Pending", color: "text-amber-600 bg-amber-50", icon: Clock },
  PAYMENT_PENDING: { label: "Awaiting Payment", color: "text-amber-600 bg-amber-50", icon: Clock },
  CONFIRMED: { label: "Confirmed", color: "text-blue-600 bg-blue-50", icon: CheckCircle2 },
  PROCESSING: { label: "Processing", color: "text-blue-600 bg-blue-50", icon: Package },
  SHIPPED: { label: "Shipped", color: "text-indigo-600 bg-indigo-50", icon: Truck },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "text-violet-600 bg-violet-50", icon: Truck },
  DELIVERED: { label: "Delivered", color: "text-green-600 bg-green-50", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: Clock },
};

export default function AccountPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const fetchData = async () => {
        try {
          const [ordersRes, addressesRes] = await Promise.allSettled([
            api.getOrders({ limit: 3 }),
            api.getAddresses(),
          ]);

          if (ordersRes.status === "fulfilled" && ordersRes.value.success && ordersRes.value.data?.orders) {
            setRecentOrders(ordersRes.value.data.orders as Order[]);
          }
          if (addressesRes.status === "fulfilled" && addressesRes.value.success && addressesRes.value.data?.addresses) {
            setAddresses(addressesRes.value.data.addresses as Address[]);
          }
        } catch {
          // Fail silently
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    } else {
      setIsLoadingData(false);
    }
  }, [authLoading, isAuthenticated]);

  // Loading
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not logged in — show login prompt
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="mb-6 rounded-full bg-slate-100 p-6">
          <UserCircle className="h-16 w-16 text-slate-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">My Account</h1>
        <p className="mb-8 max-w-sm text-slate-500">
          Log in to track your orders, manage your delivery addresses, and view your wishlists.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link href="/auth/login" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-95">
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
          <Link href="/auth/register" className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95">
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated — show dashboard
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-12">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-24 md:h-32"></div>
          <div className="px-6 pb-6 -mt-10 md:-mt-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-2xl md:text-3xl font-extrabold text-blue-600 flex-shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.firstName} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">{user?.firstName} {user?.lastName}</h1>
                <p className="text-sm text-slate-500">{user?.email}</p>
                {user?.phone && <p className="text-sm text-slate-500">{user.phone}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/account/settings")}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <Settings className="h-4 w-4" />
                  Edit Profile
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "My Orders", icon: Package, href: "/account/orders", count: recentOrders.length || undefined, color: "bg-blue-50 text-blue-600" },
            { label: "Addresses", icon: MapPin, href: "/account/addresses", count: addresses.length || undefined, color: "bg-green-50 text-green-600" },
            { label: "Wishlist", icon: Heart, href: "/account/wishlist", color: "bg-pink-50 text-pink-600" },
            { label: "My Reviews", icon: Star, href: "/account/reviews", color: "bg-amber-50 text-amber-600" },
          ].map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className={`h-10 w-10 rounded-xl ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="font-bold text-sm text-slate-900">{item.label}</p>
              {item.count !== undefined && (
                <p className="text-xs text-slate-400 mt-0.5">{item.count} saved</p>
              )}
            </Link>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
            <Link href="/account/orders" className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoadingData ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => {
                const statusConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
                const StatusIcon = statusConfig.icon;
                return (
                  <Link 
                    key={order.id} 
                    href={`/account/orders/${order.id}`}
                    className="flex items-center gap-4 p-5 hover:bg-slate-50 transition"
                  >
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900">Order #{order.orderNumber}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {" · "}{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm text-slate-900">₵{order.totalInCedis?.toLocaleString()}</p>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <ShoppingBag className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No orders yet</p>
              <p className="text-sm text-slate-400 mt-1 mb-4">Start shopping to see your orders here.</p>
              <Link href="/products" className="text-sm text-blue-600 font-bold hover:underline">
                Browse Products
              </Link>
            </div>
          )}
        </div>

        {/* Saved Addresses */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Delivery Addresses</h2>
            <Link href="/account/addresses" className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
              Manage <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {addresses.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {addresses.slice(0, 2).map((addr) => (
                <div key={addr.id} className="p-5 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900">{addr.label || addr.fullName}</p>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{addr.streetAddress}, {addr.city}, {addr.region}</p>
                    <p className="text-xs text-slate-400">{addr.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <MapPin className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No addresses saved</p>
              <p className="text-sm text-slate-400 mt-1">Save your delivery address for faster checkout.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
