import { Skeleton } from "@/components/ui/skeleton";

function MentorCardSkeleton() {
  return (
    <article className="rounded-(--r-xl) border border-border bg-(--white) p-4 shadow-(--shadow-sm)">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-5 w-24 rounded-full" />
      <Skeleton className="mt-4 h-10 w-full rounded-[var(--r-md)]" />
    </article>
  );
}

export default function MentorshipLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <MentorCardSkeleton key={index} />
      ))}
    </div>
  );
}
