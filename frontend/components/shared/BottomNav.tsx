'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3X3, ShoppingCart, Heart, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/products', icon: Grid3X3, label: 'Shop' },
  { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: true },
  { href: '/account/wishlist', icon: Heart, label: 'Wishlist', badge: true },
  { href: '/account', icon: User, label: 'Account' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();

  // Hide on dashboard/admin/seller/checkout pages
  const hiddenPaths = ['/admin', '/seller', '/checkout', '/auth'];
  if (hiddenPaths.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : item.href === '/account'
              ? pathname.startsWith('/account') && !pathname.startsWith('/account/wishlist')
              : pathname.startsWith(item.href);

          const badgeCount = item.label === 'Cart' ? itemCount : (item.label === 'Wishlist' ? wishlistItems.length : 0);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                {item.badge && badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
