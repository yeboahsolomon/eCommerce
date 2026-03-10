'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if not provided
  const crumbs: BreadcrumbItem[] = items || generateCrumbs(pathname);

  if (crumbs.length === 0) return null;

  // Schema.org BreadcrumbList structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      ...crumbs.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: crumb.label,
        ...(crumb.href ? { item: crumb.href } : {}),
      })),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <nav aria-label="Breadcrumb" className={`flex items-center text-sm text-gray-500 overflow-x-auto no-scrollbar ${className}`}>
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-blue-600 transition-colors shrink-0"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {crumbs.map((crumb, index) => (
          <span key={index} className="flex items-center shrink-0">
            <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-gray-300" />
            {crumb.href && index < crumbs.length - 1 ? (
              <Link
                href={crumb.href}
                className="hover:text-blue-600 transition-colors truncate max-w-[150px]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium truncate max-w-[200px]">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}

function generateCrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [];

  // Map common segments to nice labels
  const labelMap: Record<string, string> = {
    products: 'Products',
    product: 'Product',
    category: 'Category',
    cart: 'Cart',
    checkout: 'Checkout',
    account: 'My Account',
    orders: 'Orders',
    wishlist: 'Wishlist',
    shop: 'Shop',
    search: 'Search',
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    returns: 'Return Policy',
    track: 'Track Order',
  };

  segments.forEach((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = labelMap[segment] || decodeURIComponent(segment).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    crumbs.push({
      label,
      href: index < segments.length - 1 ? href : undefined,
    });
  });

  return crumbs;
}
