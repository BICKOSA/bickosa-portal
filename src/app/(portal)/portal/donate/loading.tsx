import { Skeleton } from "@/components/ui/skeleton";

function CampaignCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] shadow-[var(--shadow-sm)]">
      <Skeleton className="h-[110px] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full rounded-[var(--r-md)]" />
      </div>
    </article>
  );
}

export default function DonateLoading() {
  return (
    <section className="space-y-6">
      <div className="rounded-[var(--r-xl)] bg-[linear-gradient(120deg,var(--navy-900),var(--navy-700))] p-5 shadow-[var(--shadow-md)]">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-20 bg-[color:rgba(255,255,255,0.2)]" />
              <Skeleton className="mt-2 h-7 w-24 bg-[color:rgba(255,255,255,0.35)]" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <CampaignCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
