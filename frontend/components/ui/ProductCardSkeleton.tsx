import { Skeleton } from "./Skeleton";

export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <Skeleton className="aspect-square w-full" />
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="mb-2 h-3 w-1/3" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-4 h-4 w-2/3" />
        <div className="mt-auto flex items-center justify-between">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
