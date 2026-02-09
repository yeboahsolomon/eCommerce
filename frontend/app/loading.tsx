import ProductGridSkeleton from "@/components/ui/ProductGridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Hero Skeleton */}
      <div className="bg-slate-200 rounded-3xl h-[300px] w-full max-w-7xl mx-auto"></div>

      {/* Grid Skeleton */}
      <ProductGridSkeleton />
    </div>
  );
}
