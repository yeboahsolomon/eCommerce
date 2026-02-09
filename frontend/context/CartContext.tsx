"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { Cart, CartContextType, Product } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";

const CartContext = createContext<CartContextType | undefined>(undefined);

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

  const addItem = async (productId: string, quantity: number = 1, product?: Product) => {
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
              const newCart = currentCart ? { ...currentCart } : { id: 'local', items: [], itemCount: 0, subtotalInCedis: 0 };
              
              const existingItemIndex = newCart.items.findIndex(i => i.productId === productId);
              
              if (existingItemIndex > -1) {
                  newCart.items[existingItemIndex].quantity += quantity;
              } else {
                  // Ensure price is handled correctly
                  const price = (productToAdd!.priceInPesewas / 100) || 0;
                  
                  newCart.items.push({
                      id: `local-${Date.now()}`,
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
                          stockQuantity: productToAdd!.stockQuantity || 0
                      }
                  });
              }
              
              // Recalculate totals
              newCart.itemCount = newCart.items.reduce((acc, item) => acc + item.quantity, 0);
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
        // Need CartItemID. 
        if (!cart) return;
        const item = cart.items.find((i) => i.productId === productId);
        if (item) {
            try {
                const res = await api.removeFromCart(item.id); 
                if (res.success && res.data?.cart) {
                     setCart(res.data.cart as unknown as Cart);
                } else if (res.success) {
                   // Fallback optimistic
                   setCart(prev => prev ? ({
                       ...prev,
                       items: prev.items.filter(i => i.id !== item.id),
                       itemCount: prev.itemCount - item.quantity,
                       subtotalInCedis: prev.subtotalInCedis - ((item.product.priceInPesewas / 100) * item.quantity)
                   }) : null);
                }
                toast.success("Removed from cart");
            } catch(e) {
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
              const itemCount = newItems.reduce((acc, i) => acc + i.quantity, 0);
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
              
              const newItems = [...currentCart.items];
              const index = newItems.findIndex(i => i.productId === productId);
              
              if (index === -1) return currentCart;
              
              newItems[index] = {
                  ...newItems[index],
                  quantity: quantity
              };
              
              // Recalculate totals
              const itemCount = newItems.reduce((acc, i) => acc + i.quantity, 0);
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
