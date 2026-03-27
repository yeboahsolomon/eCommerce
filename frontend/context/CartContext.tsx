"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { Cart, CartContextType, Product } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";

const CART_STORAGE_KEY = "ghana-market-cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to ensure Cart object always has calculated totals
function normalizeCart(serverCart: any): Cart {
  if (!serverCart) return null as unknown as Cart;
  const rawItems = serverCart.items || [];
  
  // Flatten product.images array into product.image for the UI
  const items = rawItems.map((item: any) => {
    const product = item.product || {};
    return {
      ...item,
      product: {
        ...product,
        image: product.image || (product.images && product.images[0] ? product.images[0].url : null),
      }
    };
  });

  // User explicitly requested the counter to represent the NUMBER OF DISTINCT ITEMS
  // instead of the raw total quantity sum
  const itemCount = items.length;

  const subtotalInCedis = items.reduce((sum: number, item: any) => {
    const pricePesewas = item.product?.priceInPesewas || item.priceAtAddInPesewas || (item.priceAtAddInCedis ? item.priceAtAddInCedis * 100 : 0) || 0;
    return sum + ((pricePesewas / 100) * (item.quantity || 0));
  }, 0);

  return {
    ...serverCart,
    items,
    itemCount,
    subtotalInCedis
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const wasAuthenticated = useRef<boolean | null>(null);

  // Load & merge cart on auth changes
  useEffect(() => {
    // Wait for the auth check to finish before doing anything
    if (isAuthLoading) return;

    const loadCart = async () => {
      setIsLoading(true);

      if (isAuthenticated) {
        // Detect guest → authenticated transition: merge localStorage cart
        if (wasAuthenticated.current === false) {
          const savedCart = localStorage.getItem(CART_STORAGE_KEY);
          if (savedCart) {
            try {
              const parsed = JSON.parse(savedCart);
              const guestItems = (parsed.items || []).map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity || 1,
              }));
              if (guestItems.length > 0) {
                await api.mergeCart({ items: guestItems });
              }
            } catch (e) {
              console.error("Failed to merge guest cart:", e);
            }
            localStorage.removeItem(CART_STORAGE_KEY);
          }
        }

        // Fetch the server cart (includes any merged items)
        try {
          const res = await api.getCart();
          if (res.success && res.data?.cart) {
            setCart(normalizeCart(res.data.cart));
          }
        } catch (error) {
          console.error("Failed to load server cart", error);
        }
      } else {
        // Detect authenticated → guest transition (logout): preserve cart items
        if (wasAuthenticated.current === true && cart && cart.items && cart.items.length > 0) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
          // Cart is already in state, no need to re-set
        } else {
          // Guest: load from localStorage
          const savedCart = localStorage.getItem(CART_STORAGE_KEY);
          if (savedCart) {
            try {
              const parsedCart = JSON.parse(savedCart);
              if (!parsedCart.items) parsedCart.items = [];
              setCart(parsedCart);
            } catch (error) {
              console.error("Failed to parse cart", error);
              localStorage.removeItem(CART_STORAGE_KEY);
            }
          } else {
            setCart(null);
          }
        }
      }

      wasAuthenticated.current = isAuthenticated;
      setIsLoading(false);
    };

    loadCart();
  }, [isAuthenticated, isAuthLoading]);

  // Save Cart to LocalStorage (only if Guest)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && cart) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isLoading, isAuthenticated]);

  // --- ACTIONS ---

  const addItem = async (productId: string, quantity: number = 1, product?: Product, variantId?: string) => {
    // If authenticated, API call
    if (isAuthenticated) {
      try {
        const res = await api.addToCart(productId, quantity, variantId);
        if (res.success && res.data?.cart) {
           setCart(normalizeCart(res.data.cart));
           toast.success("Added to cart");
        }
      } catch (error) {
        console.error("Add to cart error:", error);
        toast.error("Failed to add to cart");
      }
    } else {
      // Local Logic
      try {
        let productToAdd = product;
        
        // If product not provided, fetch from API
        if (!productToAdd) {
             const res = await api.getProduct(productId);
             if (res.success && (res.data as any).product) {
                 productToAdd = (res.data as any).product;
             }
        }

        if (productToAdd) {
           setCart((currentCart) => {
              // Deep copy the cart and its items array to prevent React Strict Mode direct sequence mutations
              const newItems = currentCart?.items ? currentCart.items.map(item => ({ ...item })) : [];
              const newCart = currentCart ? { ...currentCart, items: newItems } : { id: `local-${Date.now()}`, items: newItems as any[], itemCount: 0, subtotalInCedis: 0 };
              
              const existingItemIndex = newCart.items.findIndex(i => i.productId === productId && i.variantId === (variantId || undefined));
              
              if (existingItemIndex > -1) {
                  newCart.items[existingItemIndex].quantity += quantity;
              } else {
                  // Ensure price is handled correctly
                  let priceRes = productToAdd!.priceInPesewas !== undefined ? productToAdd!.priceInPesewas : ((productToAdd as any).priceInCedis ? (productToAdd as any).priceInCedis * 100 : 0);
                  let variantRes = undefined;
                  if (variantId && productToAdd!.variants) {
                      const v = productToAdd!.variants.find(v => v.id === variantId);
                      if (v) {
                          variantRes = v;
                          priceRes = v.priceInPesewas || priceRes;
                      }
                  }
                  const price = (priceRes / 100) || 0;
                  
                  newCart.items.push({
                      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                      productId,
                      variantId,
                      variant: variantRes ? { ...variantRes, priceInCedis: variantRes.priceInPesewas ? variantRes.priceInPesewas / 100 : undefined } : undefined,
                      quantity,
                      priceAtAddInCedis: price,
                      product: {
                          id: productToAdd!.id,
                          name: productToAdd!.name,
                          slug: productToAdd!.slug,
                          priceInPesewas: productToAdd!.priceInPesewas !== undefined ? productToAdd!.priceInPesewas : ((productToAdd as any).priceInCedis ? (productToAdd as any).priceInCedis * 100 : 0),
                          image: productToAdd!.image || (productToAdd!.images && productToAdd!.images[0] ? productToAdd!.images[0].url : null),
                          inStock: productToAdd!.inStock,
                          stockQuantity: productToAdd!.stockQuantity || 0,
                          seller: productToAdd!.seller ? {
                              id: productToAdd!.seller.id,
                              businessName: productToAdd!.seller.businessName
                          } : undefined
                      }
                  });
              }
              
              // Recalculate totals
              newCart.itemCount = newCart.items.length;
              newCart.subtotalInCedis = newCart.items.reduce((acc, item) => {
                 const p = item.product.priceInPesewas !== undefined ? item.product.priceInPesewas : ((item.product as any).priceInCedis ? (item.product as any).priceInCedis * 100 : 0);
                 return acc + ((p / 100) * item.quantity);
              }, 0);
              
              return newCart;
           });
           toast.success("Added to cart");
        } else {
            toast.error("Could not load product details");
        }
      } catch (error) {
        console.error(error);
        toast.error("Could not add item");
      }
    }
  };

  const removeItem = async (itemId: string) => {
     if (isAuthenticated) {
        if (!cart) return;
        const item = cart.items.find((i) => i.id === itemId);
        if (item) {
            try {
                const res = await api.removeFromCart(itemId); 
                if (res.success && res.data?.cart) {
                     setCart(normalizeCart(res.data.cart));
                } else {
                    // Fallback refresh
                    const rootRes = await api.getCart();
                    if (rootRes.success && rootRes.data?.cart) setCart(normalizeCart(rootRes.data.cart));
                }
                toast.success("Removed from cart");
            } catch {
                toast.error("Failed to remove");
            }
        }
    } else {
        setCart((currentCart) => {
              if (!currentCart) return null;
              
              const newItems = currentCart.items.filter(i => i.id !== itemId);
              
              if (newItems.length === currentCart.items.length) {
                  return currentCart;
              }
              
              // Recalculate totals
              const itemCount = newItems.length;
              const subtotalInCedis = newItems.reduce((acc, i) => {
                 const p = i.product.priceInPesewas !== undefined ? i.product.priceInPesewas : ((i.product as any).priceInCedis ? (i.product as any).priceInCedis * 100 : 0);
                 return acc + ((p / 100) * i.quantity);
              }, 0);
              
              return {
                  ...currentCart,
                  items: newItems,
                  itemCount,
                  subtotalInCedis
              };
        });
        toast.success("Removed from cart");
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
        removeItem(itemId);
        return;
    }
    
    if (isAuthenticated) {
        if (!cart) return;
        const item = cart.items.find((i) => i.id === itemId);
        if (item) {
            try {
             const res = await api.updateCartItem(itemId, quantity);
             if (res.success && res.data?.cart) {
                 setCart(normalizeCart(res.data.cart));
             }
            } catch {
                toast.error("Failed to update quantity");
            }
        }
    } else {
         setCart((currentCart) => {
              if (!currentCart) return null;
              
              const newItems = [...currentCart.items];
              const index = newItems.findIndex(i => i.id === itemId);
              
              if (index === -1) return currentCart;
              
              newItems[index] = {
                  ...newItems[index],
                  quantity: quantity
              };
              
              // Recalculate totals
              const itemCount = newItems.length;
              const subtotalInCedis = newItems.reduce((acc, i) => {
                 const p = i.product.priceInPesewas !== undefined ? i.product.priceInPesewas : ((i.product as any).priceInCedis ? (i.product as any).priceInCedis * 100 : 0);
                 return acc + ((p / 100) * i.quantity);
              }, 0);
              
              return {
                  ...currentCart,
                  items: newItems,
                  itemCount,
                  subtotalInCedis
              };
         });
    }
  };

  const clearCart = async () => {
    setCart(null);
    if (isAuthenticated) {
      try {
        await api.clearCart();
      } catch {
          // ignore
      }
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount: cart?.itemCount || 0,
        subtotal: cart?.subtotalInCedis || 0,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
