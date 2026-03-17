import { Skeleton } from "@/components/ui/skeleton";

function AlumniCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <Skeleton className="size-[60px] rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-5 w-1/3 rounded-full" />
        </div>
      </div>
      <Skeleton className="mt-4 h-3.5 w-1/2" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Skeleton className="h-9 rounded-[var(--r-md)]" />
        <Skeleton className="h-9 rounded-[var(--r-md)]" />
      </div>
    </div>
  );
}

export default function DirectoryLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <AlumniCardSkeleton key={index} />
      ))}
    </div>
  );
}
