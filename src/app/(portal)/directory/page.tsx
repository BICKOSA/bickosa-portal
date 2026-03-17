import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DirectoryFilters } from "@/app/(portal)/directory/_components/directory-filters";
import { DirectoryPageClient } from "@/app/(portal)/directory/_components/directory-page-client";
import DirectoryLoading from "@/app/(portal)/directory/loading";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth/auth";
import {
  getDirectoryChapters,
  getViewerIsVerified,
  listDirectoryAlumni,
  normalizeDirectoryQuery,
} from "@/lib/directory";

type DirectoryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function DirectoryResults({
  viewerIsVerified,
  query,
  chapterOptions,
}: {
  viewerIsVerified: boolean;
  query: ReturnType<typeof normalizeDirectoryQuery>;
  chapterOptions: Awaited<ReturnType<typeof getDirectoryChapters>>;
}) {
  const { alumni, total } = await listDirectoryAlumni({
    viewerIsVerified,
    query,
  });

  return (
    <DirectoryPageClient
      initialAlumni={alumni}
      initialTotal={total}
      initialQuery={query}
      chapterOptions={chapterOptions}
      showShell={false}
    />
  );
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const query = normalizeDirectoryQuery(resolvedParams);

  const [viewerIsVerified, chapterOptions] = await Promise.all([
    getViewerIsVerified(session.user.id, Boolean(session.user.emailVerified)),
    getDirectoryChapters(),
  ]);

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Community"
        title="Alumni Directory"
        description="Find fellow alumni by name, class year, location, chapter, and industry."
      />
      <DirectoryFilters chapterOptions={chapterOptions} />
      <Suspense fallback={<DirectoryLoading />}>
        <DirectoryResults
          viewerIsVerified={viewerIsVerified}
          query={query}
          chapterOptions={chapterOptions}
        />
      </Suspense>
    </section>
  );
}
