"use client";

import { memo } from "react";
import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";
import {
  Smartphone, Shirt, UtensilsCrossed, Home, Sparkles, Monitor,
  ShoppingBag, Dumbbell, Baby, BookOpen, Car, Wrench,
} from "lucide-react";
import ProductCarousel from "./ProductCarousel";
import { Product } from "@/types";

/** Map category slugs to icons for visual identity */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Monitor,
  fashion: Shirt,
  "food-groceries": UtensilsCrossed,
  "home-kitchen": Home,
  beauty: Sparkles,
  "phones-tablets": Smartphone,
  sports: Dumbbell,
  "baby-kids": Baby,
  books: BookOpen,
  automotive: Car,
  "tools-hardware": Wrench,
};

/** Map category slugs to color themes */
const CATEGORY_THEMES: Record<string, { iconColor: string; iconBg: string; gradient: string }> = {
  electronics:       { iconColor: "text-blue-600",    iconBg: "bg-blue-50",    gradient: "from-blue-500 to-blue-600" },
  fashion:           { iconColor: "text-violet-600",  iconBg: "bg-violet-50",  gradient: "from-violet-500 to-purple-600" },
  "food-groceries":  { iconColor: "text-amber-600",   iconBg: "bg-amber-50",   gradient: "from-amber-500 to-orange-600" },
  "home-kitchen":    { iconColor: "text-emerald-600", iconBg: "bg-emerald-50", gradient: "from-emerald-500 to-green-600" },
  beauty:            { iconColor: "text-pink-600",    iconBg: "bg-pink-50",    gradient: "from-pink-500 to-rose-600" },
  "phones-tablets":  { iconColor: "text-cyan-600",    iconBg: "bg-cyan-50",    gradient: "from-cyan-500 to-teal-600" },
  sports:            { iconColor: "text-indigo-600",  iconBg: "bg-indigo-50",  gradient: "from-indigo-500 to-blue-600" },
  "baby-kids":       { iconColor: "text-rose-600",    iconBg: "bg-rose-50",    gradient: "from-rose-500 to-pink-600" },
  books:             { iconColor: "text-teal-600",    iconBg: "bg-teal-50",    gradient: "from-teal-500 to-emerald-600" },
  automotive:        { iconColor: "text-slate-600",   iconBg: "bg-slate-100",  gradient: "from-slate-500 to-slate-700" },
  "tools-hardware":  { iconColor: "text-orange-600",  iconBg: "bg-orange-50",  gradient: "from-orange-500 to-red-600" },
};

const DEFAULT_THEME = { iconColor: "text-blue-600", iconBg: "bg-blue-50", gradient: "from-blue-500 to-indigo-500" };

interface CategoryProductRowProps {
  category: {
    id: string;
    name: string;
    slug: string;
  };
  products: Product[];
  isLoading?: boolean;
}

/**
 * A per-category product carousel that displays top-picked products
 * from a specific category. Uses the category's icon and color theme
 * for visual identity.
 */
function CategoryProductRow({ category, products, isLoading = false }: CategoryProductRowProps) {
  if (!isLoading && products.length === 0) return null;

  const Icon = CATEGORY_ICONS[category.slug] || ShoppingBag;
  const theme = CATEGORY_THEMES[category.slug] || DEFAULT_THEME;

  return (
    <ProductCarousel
      title={`Top in ${category.name}`}
      subtitle={`Popular picks from ${category.name}`}
      icon={Icon}
      iconColor={theme.iconColor}
      iconBg={theme.iconBg}
      accentGradient={theme.gradient}
      products={products}
      isLoading={isLoading}
    />
  );
}

export default memo(CategoryProductRow);
