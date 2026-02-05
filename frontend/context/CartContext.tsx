"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Cart, CartContextType } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = typeof window !== 'undefined' && !!api.getToken();

  // Load Cart
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      if (isAuthenticated) {
        try {
          const res = await api.getCart();
          if (res.success && res.data?.cart) {
            // Check if backend response matches Cart interface
            // If backend returns object directly:
             setCart(res.data.cart as unknown as Cart);
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

  const addItem = async (productId: string, quantity: number = 1) => {
    // If authenticated, API call
    if (isAuthenticated) {
      try {
        const res = await api.addToCart(productId, quantity);
        if (res.success && res.data?.cart) {
           setCart(res.data.cart as unknown as Cart);
           toast.success("Added to cart");
        }
      } catch (error) {
        toast.error("Failed to add to cart");
      }
    } else {
      // Local Logic - Complex because we need Product details to create CartItem
      // This is the limitation of ID-only addItem.
      // We will fetch product details from API first (public endpoint).
      try {
        const res = await api.getProduct(productId);
        if (res.success && (res.data as any).product) {
           const product = (res.data as any).product;
           
           setCart((currentCart) => {
              const newCart = currentCart ? { ...currentCart } : { id: 'local', items: [], itemCount: 0, subtotalInCedis: 0 };
              
              const existingItemIndex = newCart.items.findIndex(i => i.productId === productId);
              
              if (existingItemIndex > -1) {
                  newCart.items[existingItemIndex].quantity += quantity;
              } else {
                  newCart.items.push({
                      id: `local-${Date.now()}`,
                      productId,
                      quantity,
                      priceAtAddInCedis: product.priceInPesewas / 100, // Approximation
                      product: {
                          id: product.id,
                          name: product.name,
                          slug: product.slug,
                          priceInCedis: product.priceInPesewas / 100,
                          image: product.images?.[0]?.url || null,
                          inStock: product.stockQuantity > 0,
                          stockQuantity: product.stockQuantity
                      }
                  });
              }
              
              // Recalculate totals
              newCart.itemCount = newCart.items.reduce((acc, item) => acc + item.quantity, 0);
              newCart.subtotalInCedis = newCart.items.reduce((acc, item) => acc + (item.product.priceInCedis * item.quantity), 0);
              
              return newCart;
           });
           toast.success("Added to cart");
        }
      } catch (error) {
        console.error(error);
        toast.error("Could not add item");
      }
    }
  };

  const removeItem = async (productId: string) => {
     if (isAuthenticated) {
        // Need CartItemID. 
        if (!cart) return;
        const item = cart.items.find((i) => i.productId === productId);
        if (item) {
            try {
                const res = await api.removeFromCart(item.id); // Assuming this returns updated cart
                if (res.success) {
                    if (res.data?.cart) {
                        setCart(res.data.cart as unknown as Cart);
                    } else {
                        // Optimistic remove
                         setCart(prev => prev ? ({
                             ...prev,
                             items: prev.items.filter(i => i.id !== item.id),
                             itemCount: prev.itemCount - item.quantity,
                             subtotalInCedis: prev.subtotalInCedis - (item.product.priceInCedis * item.quantity)
                         }) : null);
                    }
                    toast.success("Removed from cart");
                }
            } catch(e) {
                toast.error("Failed to remove");
            }
        }
    } else {
        setCart((currentCart) => {
              if (!currentCart) return null;
              const newCart = { ...currentCart };
              const item = newCart.items.find(i => i.productId === productId);
              if (!item) return newCart;
              
              newCart.items = newCart.items.filter(i => i.productId !== productId);
              
              // Recalculate totals
              newCart.itemCount = newCart.items.reduce((acc, i) => acc + i.quantity, 0);
              newCart.subtotalInCedis = newCart.items.reduce((acc, i) => acc + (i.product.priceInCedis * i.quantity), 0);
              
              return newCart;
        });
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
             const res = await api.updateCartItem(item.id, quantity);
             if (res.success && res.data?.cart) {
                 setCart(res.data.cart as unknown as Cart);
             }
        }
    } else {
         setCart((currentCart) => {
              if (!currentCart) return null;
              const newCart = { ...currentCart };
              const index = newCart.items.findIndex(i => i.productId === productId);
              if (index === -1) return newCart;
              
              newCart.items[index].quantity = quantity;
              
              // Recalculate totals
              newCart.itemCount = newCart.items.reduce((acc, i) => acc + i.quantity, 0);
              newCart.subtotalInCedis = newCart.items.reduce((acc, i) => acc + (i.product.priceInCedis * i.quantity), 0);
              
              return newCart;
        });
    }
  };

  const clearCart = async () => {
    setCart(null);
    if (isAuthenticated) {
      await api.clearCart();
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
