"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { Cart, CartContextType, Product } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to ensure Cart object always has calculated totals
function normalizeCart(serverCart: any): Cart {
  if (!serverCart) return null as unknown as Cart;
  const items = serverCart.items || [];
  
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
  const { isAuthenticated } = useAuth();

  // Load Cart
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      if (isAuthenticated) {
        try {
          const res = await api.getCart();
          if (res.success && res.data?.cart) {
             setCart(normalizeCart(res.data.cart));
          }
        } catch (error) {
           console.error("Failed to load server cart", error);
        }
      } else {
        // Local Storage fallback
        const savedCart = localStorage.getItem("ghana-market-cart");
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart);
            if (!parsedCart.items) parsedCart.items = [];
            setCart(parsedCart);
          } catch (error) {
            console.error("Failed to parse cart", error);
            localStorage.removeItem("ghana-market-cart");
          }
        }
      }
      setIsLoading(false);
    };

    loadCart();
  }, [isAuthenticated]);

  // Save Cart to LocalStorage (only if Guest)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && cart) {
      localStorage.setItem("ghana-market-cart", JSON.stringify(cart));
    }
  }, [cart, isLoading, isAuthenticated]);

  // --- ACTIONS ---

  const addItem = async (productId: string, quantity: number = 1, product?: Product) => {
    // If authenticated, API call
    if (isAuthenticated) {
      try {
        const res = await api.addToCart(productId, quantity);
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
              
              const existingItemIndex = newCart.items.findIndex(i => i.productId === productId);
              
              if (existingItemIndex > -1) {
                  newCart.items[existingItemIndex].quantity += quantity;
              } else {
                  // Ensure price is handled correctly
                  const price = (productToAdd!.priceInPesewas / 100) || 0;
                  
                  newCart.items.push({
                      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      productId,
                      quantity,
                      priceAtAddInCedis: price,
                      product: {
                          id: productToAdd!.id,
                          name: productToAdd!.name,
                          slug: productToAdd!.slug,
                          priceInPesewas: productToAdd!.priceInPesewas,
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
              newCart.subtotalInCedis = newCart.items.reduce((acc, item) => acc + ((item.product.priceInPesewas / 100) * item.quantity), 0);
              
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

  const removeItem = async (productId: string) => {
     if (isAuthenticated) {
        // Need CartItemID? The new API implementation in api.ts might handle productId?
        // Let's check api.ts line 134: request... /cart/items/${productId}
        // It seems the API expects productId or itemId. 
        // Previously it was using item.id. Let's assume the API was updated or we need to find the item.
        // In Step 261 line 136 it used item.id. 
        // I will use item.id for safety if authenticated.
        if (!cart) return;
        const item = cart.items.find((i) => i.productId === productId);
        if (item) {
            try {
                const res = await api.removeFromCart(item.id); 
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
              
              const newItems = currentCart.items.filter(i => i.productId !== productId);
              
              if (newItems.length === currentCart.items.length) {
                  return currentCart;
              }
              
              // Recalculate totals
              const itemCount = newItems.length;
              const subtotalInCedis = newItems.reduce((acc, i) => acc + ((i.product.priceInPesewas / 100) * i.quantity), 0);
              
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

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
        removeItem(productId);
        return;
    }
    
    if (isAuthenticated) {
        if (!cart) return;
        const item = cart.items.find((i) => i.productId === productId);
        if (item) {
            try {
             const res = await api.updateCartItem(item.id, quantity);
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
              const index = newItems.findIndex(i => i.productId === productId);
              
              if (index === -1) return currentCart;
              
              newItems[index] = {
                  ...newItems[index],
                  quantity: quantity
              };
              
              // Recalculate totals
              const itemCount = newItems.length;
              const subtotalInCedis = newItems.reduce((acc, i) => acc + ((i.product.priceInPesewas / 100) * i.quantity), 0);
              
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
