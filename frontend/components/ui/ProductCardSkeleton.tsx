import { Skeleton } from "./Skeleton";

export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white">
      {/* Image area */}
      <div className="relative aspect-[4/4] bg-gradient-to-br from-slate-50 to-slate-100/80">
        <Skeleton className="absolute inset-0" />
      </div>
      {/* Details area */}
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-4 gap-2">
        <Skeleton className="h-3 w-2/5 rounded-full" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/3 rounded-full mt-1" />
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100/80">
          <Skeleton className="h-7 w-1/3 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-xl md:hidden" />
        </div>
      </div>
    </div>
  );
}
