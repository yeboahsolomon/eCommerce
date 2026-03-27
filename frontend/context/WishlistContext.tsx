"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Product } from "@/types";

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  clearWishlistLocally: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const GUEST_WISHLIST_KEY = "guest_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const syncAttempted = useRef(false);

  // Load from localStorage helper
  const loadGuestWishlist = (): WishlistItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(GUEST_WISHLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Save to localStorage helper
  const saveGuestWishlist = (newItems: WishlistItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(newItems));
    }
  };

  // Sync Guest Wishlist to Backend
  const syncGuestItemsToBackend = async (guestItems: WishlistItem[]) => {
    if (guestItems.length === 0) return;
    
    try {
      // We process them sequentially to avoid spamming the backend
      let syncedCount = 0;
      for (const item of guestItems) {
        const res = await api.addToWishlist(item.productId);
        if (res.success) syncedCount++;
      }
      
      if (syncedCount > 0) {
        // toast.success(`Synced ${syncedCount} item(s) to your account wishlist!`);
      }
      
      // We intentionally do NOT clear local storage here anymore so that 
      // the wishlist persists locally even after they log out.
    } catch (err) {
      console.error("Failed to sync guest wishlist:", err);
    }
  };

  // Fetch wishlist on mount or auth change
  useEffect(() => {
    const fetchWishlist = async () => {
      // 1. If not authenticated, load from LocalStorage
      if (!isAuthenticated) {
        setItems(loadGuestWishlist());
        setIsLoading(false);
        syncAttempted.current = false; // Reset sync flag when logged out
        return;
      }
      
      // 2. If Authenticated, check if we need to sync first
      try {
        setIsLoading(true);
        
        // Only run sync once per login session
        if (!syncAttempted.current) {
          syncAttempted.current = true;
          const guestItems = loadGuestWishlist();
          if (guestItems.length > 0) {
            await syncGuestItemsToBackend(guestItems);
          }
        }

        // Fetch the definitive list from the backend
        const res = await api.getWishlist();
        if (res.success && res.data?.items) {
          const normalizedItems = (res.data.items as any[]).map(item => ({
            ...item,
            product: {
              ...item.product,
              priceInPesewas: item.product.priceInPesewas !== undefined ? item.product.priceInPesewas : (item.product.priceInCedis ? item.product.priceInCedis * 100 : 0),
              comparePriceInPesewas: item.product.comparePriceInPesewas !== undefined ? item.product.comparePriceInPesewas : (item.product.comparePriceInCedis ? item.product.comparePriceInCedis * 100 : undefined)
            }
          }));
          setItems(normalizedItems as unknown as WishlistItem[]);
        }
      } catch (err) {
        console.error("Failed to fetch wishlist:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
        fetchWishlist();
    }
  }, [isAuthenticated, authLoading, user]);

  // Constantly mirror the current wishlist (guest or authenticated) to Local Storage
  // so that if they log out, the Local Storage is perfectly intact.
  useEffect(() => {
    if (!isLoading) {
      saveGuestWishlist(items);
    }
  }, [items, isLoading]);

  const isInWishlist = (productId: string) => {
    return items.some((item) => item.product?.id === productId || item.productId === productId);
  };

  const toggleWishlist = async (product: Product) => {
    const exists = isInWishlist(product.id);

    // ==========================================
    // NOT AUTHENTICATED (GUEST MODE)
    // ==========================================
    if (!isAuthenticated) {
      if (exists) {
        const newItems = items.filter(item => item.product?.id !== product.id && item.productId !== product.id);
        setItems(newItems);
        saveGuestWishlist(newItems);
        toast.success("Removed from wishlist");
      } else {
        const newItem: WishlistItem = {
          id: `guest-${Date.now()}`,
          productId: product.id,
          product,
          addedAt: new Date().toISOString()
        };
        const newItems = [newItem, ...items];
        setItems(newItems);
        saveGuestWishlist(newItems);
        toast.success("Added to guest wishlist");
      }
      return;
    }

    // ==========================================
    // AUTHENTICATED MODE
    // ==========================================
    try {
      if (exists) {
        // Optimistic UI update
        const itemToRemove = items.find(item => item.product?.id === product.id || item.productId === product.id);
        setItems((prev) => prev.filter((item) => item.id !== itemToRemove?.id && item.productId !== product.id && item.product?.id !== product.id));
        toast.success("Removed from wishlist");
        
        await api.removeFromWishlist(product.id);
      } else {
        // Optimistic UI update
        const tempId = `temp-${Date.now()}`;
        const newItem: WishlistItem = {
            id: tempId,
            productId: product.id,
            product,
            addedAt: new Date().toISOString()
        };
        setItems((prev) => [newItem, ...prev]);
        toast.success("Added to wishlist");

        const res = await api.addToWishlist(product.id);
        
        // Update with real ID from backend
        if (res.success && res.data?.id) {
            setItems((prev) => prev.map(item => item.id === tempId ? { ...item, id: res.data!.id } : item));
        }
      }
    } catch (err: any) {
      // Rollback on failure
      toast.error(err.message || "Failed to update wishlist");
      const res = await api.getWishlist();
      if (res.success && res.data?.items) {
        setItems(res.data.items as unknown as WishlistItem[]);
      }
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    // Find the original item so we know its productId
    const itemToRemove = items.find(i => i.id === itemId);
    if (!itemToRemove) return;

    // Optimistic UI
    const newItems = items.filter((item) => item.id !== itemId);
    setItems(newItems);

    // Guest Mode
    if (!isAuthenticated) {
      saveGuestWishlist(newItems);
      toast.success("Removed from guest wishlist");
      return;
    }

    // Auth Mode
    try {
      await api.removeFromWishlist(itemToRemove.product?.id || itemToRemove.productId);
      toast.success("Removed from wishlist");
    } catch (err) {
      toast.error("Failed to remove item");
      // Rollback
      const res = await api.getWishlist();
      if (res.success && res.data?.items) {
        setItems(res.data.items as unknown as WishlistItem[]);
      }
    }
  };

  const clearWishlistLocally = () => {
    setItems([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_WISHLIST_KEY);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        isLoading,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlistLocally
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
