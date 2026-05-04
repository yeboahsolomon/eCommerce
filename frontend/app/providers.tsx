
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <QueryClientProvider client={queryClient}>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                {children}
                <Toaster richColors position="top-center" />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      ) : (
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
              <Toaster richColors position="top-center" />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      )}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
