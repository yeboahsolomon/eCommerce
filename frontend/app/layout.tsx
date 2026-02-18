import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import MobileNav from "@/components/shared/MobileNav";
import Providers from "./providers";

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
        <Providers>
            {/* Top Header */}
            <Header />
            
            {/* Main Content Area */}
            <main className="min-h-screen max-w-7xl mx-auto px-4 py-6 mb-20 md:mb-0">
              {children}
            </main>
  
            {/* Footer (Desktop) */}
            <Footer />

            {/* Bottom Nav (Mobile Only) */}
            <MobileNav />
        </Providers>
      </body>
    </html>
  );
}

