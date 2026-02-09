import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/shared/Header";
import MobileNav from "@/components/shared/MobileNav";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ghana Market",
  description: "Best prices in West Africa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground`}>
        <AuthProvider>
          <CartProvider>
            {/* Top Header */}
            <Header />
            
            {/* Main Content Area */}
            <main className="min-h-screen max-w-7xl mx-auto px-4 py-6 pt-36 md:pt-40 mb-20 md:mb-0">
              {children}
            </main>
  
            {/* Bottom Nav (Mobile Only) */}
            <MobileNav />
            <Toaster richColors position="top-center" />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

