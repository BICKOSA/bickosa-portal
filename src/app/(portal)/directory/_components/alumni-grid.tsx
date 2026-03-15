"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AlumniCard } from "@/components/portal/alumni-card";
import type { DirectoryAlumnus } from "@/lib/directory";

type AlumniGridProps = {
  alumni: DirectoryAlumnus[];
  isLoading: boolean;
};

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

export function AlumniGrid({ alumni, isLoading }: AlumniGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <AlumniCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (alumni.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] px-6 py-12 text-center shadow-[var(--shadow-sm)]">
        <h3 className="font-[var(--font-ui)] text-lg font-semibold text-[var(--navy-900)]">
          No alumni found
        </h3>
        <p className="mt-2 text-sm text-[var(--text-3)]">
          Try adjusting your filters or searching with a different keyword.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {alumni.map((alumnus) => (
        <AlumniCard key={alumnus.id} alumnus={alumnus} />
      ))}
    </div>
  );
}
