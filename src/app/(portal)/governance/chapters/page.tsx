import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import {
  getChapterCountByRegion,
  getViewerChapterId,
  listChapters,
  normalizeChapterRegion,
} from "@/lib/governance";

type ChaptersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const regionTabs: Array<{ value: "all" | "uganda" | "uk" | "usa" | "east-africa" | "other"; label: string }> =
  [
    { value: "all", label: "All Regions" },
    { value: "uganda", label: "Uganda" },
    { value: "uk", label: "UK" },
    { value: "usa", label: "USA" },
    { value: "east-africa", label: "East Africa" },
    { value: "other", label: "Other" },
  ];

export default async function GovernanceChaptersPage({ searchParams }: ChaptersPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const selectedRegion = normalizeChapterRegion(
    typeof resolvedParams.region === "string" ? resolvedParams.region : null,
  );

  const [chapters, viewerChapterId, countsByRegion] = await Promise.all([
    listChapters({ region: selectedRegion }),
    getViewerChapterId(session.user.id),
    getChapterCountByRegion(),
  ]);
  const totalChaptersCount =
    countsByRegion.uganda +
    countsByRegion.uk +
    countsByRegion.usa +
    countsByRegion["east-africa"] +
    countsByRegion.other;

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="Chapters"
        description="Explore BICKOSA chapters around the world and connect with the chapter closest to you."
      />

      <div className="flex flex-wrap gap-2">
        {regionTabs.map((region) => {
          const href = region.value === "all" ? "/governance/chapters" : `/governance/chapters?region=${region.value}`;
          const active = selectedRegion === region.value;
          const count =
            region.value === "all"
              ? totalChaptersCount
              : countsByRegion[region.value as Exclude<typeof region.value, "all">];

          return (
            <Button key={region.value} asChild variant={active ? "navy" : "outline"} size="sm">
              <Link href={href}>
                {region.label} ({count})
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {chapters.map((chapter) => (
          <Card key={chapter.id}>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-(--navy-900)">{chapter.name}</h3>
                <Badge variant={chapter.isActive ? "success" : "warning"}>
                  {chapter.isActive ? "Active" : "Growing"}
                </Badge>
              </div>
              <p className="text-sm text-(--text-2)">
                {chapter.country}
                {chapter.city ? ` · ${chapter.city}` : ""}
              </p>
              <p className="text-sm text-(--text-2)">
                Leader: {chapter.leaderName ?? "To be announced"}
              </p>
              <p className="text-xs text-(--text-3)">
                {chapter.memberCount.toLocaleString()} members
                {chapter.foundedYear ? ` · Founded ${chapter.foundedYear}` : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/governance/chapters/${chapter.slug}`}>View chapter</Link>
                </Button>
                {!viewerChapterId ? (
                  <Button asChild size="sm">
                    <Link href="/profile">Join this chapter</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
