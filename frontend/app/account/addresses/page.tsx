"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, MapPin, Plus, Trash2, Edit2, Check } from "lucide-react";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string;
  type: string;
  fullName: string;
  phone: string;
  region: string;
  city: string;
  area?: string;
  streetAddress: string;
  gpsAddress?: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await api.getAddresses();
        if (res.success && res.data?.addresses) {
          setAddresses(res.data.addresses as Address[]);
        }
      } catch (err) {
        console.error("Failed to fetch addresses:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchAddresses();
    }
  }, [isAuthenticated, authLoading]);

  const handleDelete = async (addressId: string) => {
    setDeletingId(addressId);
    try {
      await api.deleteAddress(addressId);
      setAddresses(addresses.filter((addr) => addr.id !== addressId));
      toast.success("Address deleted");
    } catch (err) {
      toast.error("Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await api.setDefaultAddress(addressId);
      setAddresses(addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === addressId,
      })));
      toast.success("Default address updated");
    } catch (err) {
      toast.error("Failed to update default address");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">Please login to manage addresses</p>
        <Link href="/auth/login" className="text-blue-600 font-medium hover:underline">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 gap-2 mb-6">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/account" className="hover:text-blue-600">Account</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">Addresses</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Addresses</h1>
        <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" />
          Add New
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-slate-900 mb-2">No addresses saved</h2>
          <p className="text-slate-500 mb-6">Add an address for faster checkout</p>
          <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />
            Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white rounded-xl border p-5 ${
                address.isDefault ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{address.label}</h3>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{address.type}</span>
                      {address.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Default</span>
                      )}
                    </div>
                    <p className="text-slate-700">{address.fullName}</p>
                    <p className="text-sm text-slate-500">{address.phone}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {address.streetAddress}, {address.area && `${address.area}, `}
                      {address.city}, {address.region}
                    </p>
                    {address.gpsAddress && (
                      <p className="text-xs text-slate-400 mt-1">GPS: {address.gpsAddress}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Set as default"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    {deletingId === address.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
