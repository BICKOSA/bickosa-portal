import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DirectoryPageClient } from "@/app/(portal)/directory/_components/directory-page-client";
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
    />
  );
}
