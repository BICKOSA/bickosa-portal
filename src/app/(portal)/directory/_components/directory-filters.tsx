"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DirectoryChapterOption } from "@/lib/directory";

type DirectoryFiltersProps = {
  chapterOptions: DirectoryChapterOption[];
};

type YearRangeOption = {
  value: string;
  label: string;
  yearFrom: number | null;
  yearTo: number | null;
};

const YEAR_RANGE_OPTIONS: YearRangeOption[] = [
  { value: "all", label: "All Years", yearFrom: null, yearTo: null },
  { value: "2000-2005", label: "2000-2005", yearFrom: 2000, yearTo: 2005 },
  { value: "2006-2010", label: "2006-2010", yearFrom: 2006, yearTo: 2010 },
  { value: "2011-2015", label: "2011-2015", yearFrom: 2011, yearTo: 2015 },
  { value: "2016-2020", label: "2016-2020", yearFrom: 2016, yearTo: 2020 },
  { value: "2021-present", label: "2021-present", yearFrom: 2021, yearTo: null },
];

const COUNTRY_OPTIONS = ["Uganda", "UK", "USA", "Kenya", "Other"] as const;
const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Law",
  "Education",
  "Engineering",
  "Business",
  "Media",
  "Other",
] as const;

function buildParams(
  current: URLSearchParams,
  updates: Record<string, string | null | undefined>,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value && value.trim().length > 0) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
  }

  if (
    Object.keys(updates).some((key) =>
      ["search", "yearFrom", "yearTo", "country", "industry", "chapter"].includes(key),
    )
  ) {
    next.delete("page");
  }

  return next;
}

function getYearRangeValue(searchParams: URLSearchParams): string {
  const yearFrom = searchParams.get("yearFrom");
  const yearTo = searchParams.get("yearTo");
  const found = YEAR_RANGE_OPTIONS.find((range) => {
    const fromMatches = range.yearFrom === null ? !yearFrom : String(range.yearFrom) === yearFrom;
    const toMatches = range.yearTo === null ? !yearTo : String(range.yearTo) === yearTo;
    return fromMatches && toMatches;
  });

  return found?.value ?? "all";
}

export function DirectoryFilters({ chapterOptions }: DirectoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextParams = buildParams(searchParams, {
        search: searchValue.trim() || null,
      });
      const current = searchParams.toString();
      const next = nextParams.toString();
      if (current !== next) {
        router.replace(`${pathname}?${next}`, { scroll: false });
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [pathname, router, searchParams, searchValue]);

  const yearRangeValue = getYearRangeValue(searchParams);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: Record<string, null> }> = [];

    const search = searchParams.get("search");
    if (search) {
      chips.push({
        key: "search",
        label: `Search: ${search}`,
        clear: { search: null },
      });
    }

    const yearOption = YEAR_RANGE_OPTIONS.find((option) => option.value === yearRangeValue);
    if (yearOption && yearOption.value !== "all") {
      chips.push({
        key: "yearRange",
        label: `Class: ${yearOption.label}`,
        clear: { yearFrom: null, yearTo: null },
      });
    }

    const country = searchParams.get("country");
    if (country) {
      chips.push({
        key: "country",
        label: `Country: ${country}`,
        clear: { country: null },
      });
    }

    const industry = searchParams.get("industry");
    if (industry) {
      chips.push({
        key: "industry",
        label: `Industry: ${industry}`,
        clear: { industry: null },
      });
    }

    const chapter = searchParams.get("chapter");
    if (chapter) {
      const chapterLabel = chapterOptions.find((option) => option.id === chapter)?.name ?? chapter;
      chips.push({
        key: "chapter",
        label: `Chapter: ${chapterLabel}`,
        clear: { chapter: null },
      });
    }

    return chips;
  }, [chapterOptions, searchParams, yearRangeValue]);

  function applyParams(updates: Record<string, string | null>) {
    const nextParams = buildParams(searchParams, updates);
    const current = searchParams.toString();
    const next = nextParams.toString();
    if (current !== next) {
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
  }

  return (
    <div className="space-y-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search name, employer, or city"
          aria-label="Search alumni"
          containerClassName="sm:col-span-2 lg:col-span-2"
        />

        <Select
          value={yearRangeValue}
          onValueChange={(value) => {
            const selected = YEAR_RANGE_OPTIONS.find((option) => option.value === value);
            applyParams({
              yearFrom: selected?.yearFrom ? String(selected.yearFrom) : null,
              yearTo: selected?.yearTo ? String(selected.yearTo) : null,
            });
          }}
        >
          <SelectTrigger aria-label="Filter by year range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("country") ?? "all"}
          onValueChange={(value) => applyParams({ country: value === "all" ? null : value })}
        >
          <SelectTrigger aria-label="Filter by country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("industry") ?? "all"}
          onValueChange={(value) => applyParams({ industry: value === "all" ? null : value })}
        >
          <SelectTrigger aria-label="Filter by industry">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRY_OPTIONS.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          value={searchParams.get("chapter") ?? "all"}
          onValueChange={(value) => applyParams({ chapter: value === "all" ? null : value })}
        >
          <SelectTrigger aria-label="Filter by chapter">
            <SelectValue placeholder="All Chapters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Chapters</SelectItem>
            {chapterOptions.map((chapter) => (
              <SelectItem key={chapter.id} value={chapter.id}>
                {chapter.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 sm:col-span-1 lg:col-span-4">
            {activeChips.map((chip) => (
              <Button
                key={chip.key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyParams(chip.clear)}
                className="h-8 rounded-full px-3 text-xs"
              >
                {chip.label}
                <X className="size-3" />
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
