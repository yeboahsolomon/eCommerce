"use client";
import Link from "next/link";
import { 
  Smartphone, Shirt, UtensilsCrossed, Home, Sparkles, Monitor, 
  ShoppingBag, Dumbbell, Baby, BookOpen, Car, Wrench, LucideIcon
} from "lucide-react";

// Map category slugs to icons
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

// Gradient backgrounds for each category
const CATEGORY_GRADIENTS = [
  "from-blue-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-green-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-teal-600",
  "from-indigo-500 to-blue-600",
  "from-red-500 to-rose-600",
];

interface CategoryCardProps {
  name: string;
  slug: string;
  productCount?: number;
  index?: number;
}

export default function CategoryCard({ name, slug, productCount, index = 0 }: CategoryCardProps) {
  const Icon = CATEGORY_ICONS[slug] || ShoppingBag;
  const gradient = CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];

  return (
    <Link 
      href={`/category/${slug}`}
      className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-slate-200/50 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-7 w-7 text-white" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{name}</p>
        {productCount !== undefined && (
          <p className="text-xs text-slate-400 mt-0.5">{productCount} items</p>
        )}
      </div>
    </Link>
  );
}
