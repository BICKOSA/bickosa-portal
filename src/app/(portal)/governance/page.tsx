import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FileText, Landmark, Scale, ShieldCheck } from "lucide-react";

import { CURRENT_ELECTION_CYCLE } from "@/config/leadership";
import { PageHeader } from "@/components/layout/page-header";
import { LeaderCard } from "@/components/portal/leader-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import {
  getExecutiveCommittee,
  listChapterOverview,
  listGovernanceDocuments,
} from "@/lib/governance";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function documentIcon(category: string) {
  if (category === "constitution") return Scale;
  if (category === "policy") return ShieldCheck;
  return FileText;
}

export default async function GovernancePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const includePrivate = (session.user as { role?: string }).role === "admin";
  const [leaders, chapterOverview, documentGroups] = await Promise.all([
    getExecutiveCommittee(),
    listChapterOverview(6),
    listGovernanceDocuments({ includePrivate }),
  ]);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="About"
        title="Governance & Transparency"
        description="Access leadership information, chapter visibility, and official governance documents."
      />

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Executive Committee</CardTitle>
              <p className="text-sm text-(--text-2)">{CURRENT_ELECTION_CYCLE}</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {leaders.map((leader) => (
                  <LeaderCard
                    key={leader.alumniProfileId}
                    alumniProfileId={leader.alumniProfileId}
                    fullName={leader.fullName}
                    role={leader.role}
                    classYear={leader.classYear}
                    avatarUrl={leader.avatarUrl}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Chapters Overview</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/governance/chapters">View all chapters</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {chapterOverview.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between gap-3 rounded-(--r-lg) border border-(--border) p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-(--text-1)">{chapter.name}</p>
                    <p className="text-xs text-(--text-3)">
                      {chapter.country} · {chapter.memberCount.toLocaleString()} members
                    </p>
                  </div>
                  <Badge variant={chapter.status === "Active" ? "success" : "warning"}>
                    {chapter.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Official Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentGroups.map((group) => (
                <div key={group.category} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-(--gold-800)">
                    {group.label}
                  </h3>
                  {group.items.length === 0 ? (
                    <p className="text-xs text-(--text-3)">No documents published in this category yet.</p>
                  ) : (
                    group.items.map((doc) => {
                      const Icon = documentIcon(doc.category);
                      return (
                        <div
                          key={doc.id}
                          className="rounded-(--r-lg) border border-(--border) bg-(--white) p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 gap-2">
                              <Icon className="mt-0.5 size-4 shrink-0 text-(--navy-700)" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-(--text-1)">
                                  {doc.title}
                                </p>
                                {doc.description ? (
                                  <p className="mt-1 text-xs text-(--text-2)">{doc.description}</p>
                                ) : null}
                                <p className="mt-1 text-xs text-(--text-3)">
                                  {formatFileSize(doc.fileSize)}
                                  {doc.year ? ` · ${doc.year}` : ""}
                                </p>
                              </div>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/api/governance/documents/${doc.id}/download`}>Download</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card variant="navy-tint" accentBar>
            <CardHeader>
              <CardTitle>Mission & Values</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-(--text-2)">
              <p>
                To unite Bishop Cipriano Kihangire alumni in service, mentorship, and collective impact
                for our school, community, and future generations.
              </p>
              <div className="rounded-(--r-md) border border-(--border) bg-(--white) px-3 py-2 text-xs font-semibold text-(--navy-900)">
                Per Aspera Ad Astra
              </div>
              <p className="text-xs text-(--text-3)">
                <Landmark className="mr-1 inline size-3.5" />
                Registered under Uganda law
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
