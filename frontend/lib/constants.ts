import { Truck, ShieldCheck, BadgePercent, RotateCcw } from 'lucide-react';

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Northern",
  "Volta",
  "Bono",
  "Ahafo",
  "Upper East",
  "Upper West",
  "Savannah",
  "North East",
  "Bono East",
  "Oti",
  "Western North",
] as const;

export const PLATFORM_FEATURES = [
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Nationwide delivery across all 16 regions of Ghana within 3-5 business days.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: ShieldCheck,
    title: "Buyer Protection",
    description: "Shop with confidence. Every purchase is covered by our money-back guarantee.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: BadgePercent,
    title: "Best Prices",
    description: "Compare prices from hundreds of sellers to find the best deals in Ghana.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "Changed your mind? Return items within 7 days for a full refund.",
    color: "bg-violet-50 text-violet-600",
  },
] as const;

export const SELLER_PERKS = [
  "No monthly fees",
  "Mobile money payouts",
  "Free seller tools",
  "24/7 support",
] as const;
