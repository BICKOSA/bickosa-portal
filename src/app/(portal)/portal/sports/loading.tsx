import { Skeleton } from "@/components/ui/skeleton";

function StatsCardSkeleton() {
  return (
    <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-3 h-7 w-1/2" />
      <Skeleton className="mt-2 h-3.5 w-2/3" />
    </div>
  );
}

export default function SportsLoading() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <aside className="space-y-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </aside>
      </div>
    </section>
  );
}
