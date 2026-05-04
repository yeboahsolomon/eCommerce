'use client';
import { usePathname } from 'next/navigation';
import Header from "./Header";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import BottomNav from "./BottomNav";

export default function StorefrontLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <main className="min-h-screen bg-slate-900">{children}</main>;
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
