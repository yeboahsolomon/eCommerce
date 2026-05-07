'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from "./Header";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import BottomNav from "./BottomNav";

export default function StorefrontLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Admin routes: render children directly without storefront chrome.
  // Use suppressHydrationWarning and a simple wrapper to avoid mismatch.
  if (isAdmin) {
    return <>{children}</>;
  }

  // Storefront: show header/footer only after mount to avoid hydration issues
  // with dynamic client-only components (MobileNav, BottomNav, etc.)
  if (!mounted) {
    return (
      <main className="min-h-screen max-w-7xl mx-auto px-4 py-6 mb-20 md:mb-0">
        {children}
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen max-w-7xl mx-auto px-4 py-6 mb-20 md:mb-0">
        {children}
      </main>
      <Footer />
      <MobileNav />
      <BottomNav />
    </>
  );
}
