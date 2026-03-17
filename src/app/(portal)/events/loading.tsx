import { Skeleton } from "@/components/ui/skeleton";

function EventCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] shadow-[var(--shadow-sm)]">
      <Skeleton className="h-[100px] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-[var(--r-md)]" />
        </div>
      </div>
    </article>
  );
}

export default function EventsLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </div>
  );
}
