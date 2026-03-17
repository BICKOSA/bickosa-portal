"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DirectoryFilters } from "@/app/(portal)/directory/_components/directory-filters";
import { AlumniGrid } from "@/app/(portal)/directory/_components/alumni-grid";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { DirectoryAlumnus, DirectoryChapterOption, DirectoryQuery } from "@/lib/directory";

type DirectoryApiResponse = {
  data: DirectoryAlumnus[];
  total: number;
  page: number;
  limit: number;
};

type DirectoryPageClientProps = {
  initialAlumni: DirectoryAlumnus[];
  initialTotal: number;
  initialQuery: DirectoryQuery;
  chapterOptions: DirectoryChapterOption[];
  showShell?: boolean;
};

export function DirectoryPageClient({
  initialAlumni,
  initialTotal,
  initialQuery,
  chapterOptions,
  showShell = true,
}: DirectoryPageClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [alumni, setAlumni] = useState(initialAlumni);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const didSkipInitialFetch = useRef(false);

  const initialQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (initialQuery.search) params.set("search", initialQuery.search);
    if (initialQuery.yearFrom !== null) params.set("yearFrom", String(initialQuery.yearFrom));
    if (initialQuery.yearTo !== null) params.set("yearTo", String(initialQuery.yearTo));
    if (initialQuery.country) params.set("country", initialQuery.country);
    if (initialQuery.industry) params.set("industry", initialQuery.industry);
    if (initialQuery.chapter) params.set("chapter", initialQuery.chapter);
    if (initialQuery.page > 1) params.set("page", String(initialQuery.page));
    if (initialQuery.limit !== 24) params.set("limit", String(initialQuery.limit));
    return params.toString();
  }, [initialQuery]);

  const page = Number.parseInt(searchParams.get("page") ?? String(initialQuery.page), 10) || 1;
  const limit = Number.parseInt(searchParams.get("limit") ?? String(initialQuery.limit), 10) || 24;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    const controller = new AbortController();
    const queryString = searchParams.toString();

    if (!didSkipInitialFetch.current && queryString === initialQueryString) {
      didSkipInitialFetch.current = true;
      return () => controller.abort();
    }

    didSkipInitialFetch.current = true;
    setIsLoading(true);
    fetch(`/api/directory?${queryString}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load directory results.");
        }
        return (await response.json()) as DirectoryApiResponse;
      })
      .then((payload) => {
        setAlumni(payload.data);
        setTotal(payload.total);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setAlumni([]);
        setTotal(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [initialQueryString, searchParams]);

  const resultLabel = useMemo(() => {
    if (isLoading) return "Searching alumni...";
    return `${total.toLocaleString()} alumni in directory`;
  }, [isLoading, total]);

  function updatePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    const current = searchParams.toString();
    const next = params.toString();
    if (current !== next) {
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  return (
    <section className="space-y-4">
      {showShell ? (
        <>
          <PageHeader
            eyebrow="Community"
            title="Alumni Directory"
            description="Find fellow alumni by name, class year, location, chapter, and industry."
          />
          <DirectoryFilters chapterOptions={chapterOptions} />
        </>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-3)]">{resultLabel}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => updatePage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-[var(--text-3)]">
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => updatePage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <AlumniGrid alumni={alumni} isLoading={isLoading} onClearFilters={clearFilters} />
    </section>
  );
}
