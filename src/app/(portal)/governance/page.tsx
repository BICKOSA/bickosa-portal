import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FileText, Landmark, Scale, ShieldCheck } from "lucide-react";

import { CURRENT_ELECTION_CYCLE } from "@/config/leadership";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { LeaderCard } from "@/components/portal/leader-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import {
  getCurrentLeadership,
  getUpcomingElectionBanner,
  listPastElectionSummaries,
  type LeadershipPerson,
} from "@/lib/governance-leadership";
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

function leadershipSortOrder(position: string): number {
  const key = position.trim().toLowerCase();
  if (key === "president") return 0;
  if (key === "secretary general") return 1;
  if (key === "treasurer") return 2;
  return 10;
}

function formatTerm(start: Date | null, end: Date | null): string {
  if (!start && !end) {
    return "Term dates to be announced";
  }
  if (start && end) {
    return `${start.getFullYear()} - ${end.getFullYear()}`;
  }
  if (start) {
    return `Since ${start.getFullYear()}`;
  }
  return `Until ${end?.getFullYear()}`;
}

function LeadershipGrid({ leaders }: { leaders: LeadershipPerson[] }) {
  if (leaders.length === 0) {
    return (
      <div className="rounded-(--r-lg) border border-dashed border-border bg-(--white) px-5 py-10 text-center">
        <p className="text-base text-(--text-3)">Leadership details coming soon.</p>
      </div>
    );
  }

  const sorted = [...leaders].sort((a, b) => leadershipSortOrder(a.position) - leadershipSortOrder(b.position));
  const president = sorted.find((leader) => leader.position.trim().toLowerCase() === "president");
  const secretary = sorted.find((leader) => leader.position.trim().toLowerCase() === "secretary general");
  const treasurer = sorted.find((leader) => leader.position.trim().toLowerCase() === "treasurer");
  const remaining = sorted.filter(
    (leader) =>
      leader.userId !== president?.userId && leader.userId !== secretary?.userId && leader.userId !== treasurer?.userId,
  );

  return (
    <div className="grid gap-3 md:grid-cols-12">
      {president ? (
        <Link
          href={`/governance/leaders/${president.userId}`}
          className="rounded-(--r-xl) border border-(--navy-700) bg-(--navy-900) p-4 text-(--white) shadow-(--shadow-md) md:col-span-6"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-(--gold-300)">President</p>
          <div className="mt-3 flex items-start gap-3">
            <Avatar src={president.avatarUrl} name={president.fullName} size="xl" className="border-(--navy-300)" />
            <div>
              <p className="text-xl font-semibold text-(--gold-500)">{president.fullName}</p>
              <p className="text-sm text-(--navy-200)">
                {president.graduationYear ? `Class of ${president.graduationYear}` : "BICKOSA Alumni"}
              </p>
              <p className="mt-1 text-xs text-(--navy-100)">{formatTerm(president.termStart, president.termEnd)}</p>
              {president.bio ? <p className="mt-2 text-sm text-(--navy-100)">{president.bio.slice(0, 180)}...</p> : null}
            </div>
          </div>
        </Link>
      ) : null}
      {secretary ? (
        <Link
          href={`/governance/leaders/${secretary.userId}`}
          className="rounded-(--r-xl) border border-border bg-(--white) p-4 shadow-(--shadow-sm) md:col-span-3"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-(--text-3)">Secretary General</p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar src={secretary.avatarUrl} name={secretary.fullName} size="lg" />
            <div>
              <p className="text-sm font-semibold text-(--text-1)">{secretary.fullName}</p>
              <p className="text-xs text-(--text-3)">{formatTerm(secretary.termStart, secretary.termEnd)}</p>
            </div>
          </div>
        </Link>
      ) : null}
      {treasurer ? (
        <Link
          href={`/governance/leaders/${treasurer.userId}`}
          className="rounded-(--r-xl) border border-border bg-(--white) p-4 shadow-(--shadow-sm) md:col-span-3"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-(--text-3)">Treasurer</p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar src={treasurer.avatarUrl} name={treasurer.fullName} size="lg" />
            <div>
              <p className="text-sm font-semibold text-(--text-1)">{treasurer.fullName}</p>
              <p className="text-xs text-(--text-3)">{formatTerm(treasurer.termStart, treasurer.termEnd)}</p>
            </div>
          </div>
        </Link>
      ) : null}
      {remaining.map((leader) => (
        <Link
          key={`${leader.position}-${leader.userId}`}
          href={`/governance/leaders/${leader.userId}`}
          className="rounded-(--r-xl) border border-border bg-(--white) p-4 shadow-(--shadow-sm) md:col-span-3"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-(--text-3)">{leader.position}</p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar src={leader.avatarUrl} name={leader.fullName} size="lg" />
            <div>
              <p className="text-sm font-semibold text-(--text-1)">{leader.fullName}</p>
              <p className="text-xs text-(--text-3)">{formatTerm(leader.termStart, leader.termEnd)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function GovernancePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const includePrivate = (session.user as { role?: string }).role === "admin";
  const [leaders, chapterOverview, documentGroups, currentLeadership, upcomingElection, pastElectionSummaries] = await Promise.all([
    getExecutiveCommittee(),
    listChapterOverview(6),
    listGovernanceDocuments({ includePrivate }),
    getCurrentLeadership(),
    getUpcomingElectionBanner(),
    listPastElectionSummaries(),
  ]);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="About"
        title="Governance & Transparency"
        description="Access leadership information, chapter visibility, and official governance documents."
      />

      <Card>
        <CardHeader>
          <CardTitle>Current Leadership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingElection ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-(--r-lg) border border-(--gold-300) bg-(--gold-50) px-4 py-3">
              <p className="text-sm text-(--gold-800)">
                <span className="font-semibold">{upcomingElection.title}</span> is currently open -{" "}
                {upcomingElection.status === "nominations_open" ? "Nominations" : "Voting"} close on{" "}
                {upcomingElection.closesAt.toLocaleDateString("en-UG", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <Button asChild variant="navy" size="sm">
                <Link href="/voting">Go to Voting</Link>
              </Button>
            </div>
          ) : null}

          <LeadershipGrid leaders={currentLeadership} />

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-(--text-1)">Past Election Results</h3>
            {pastElectionSummaries.length === 0 ? (
              <p className="rounded-(--r-md) border border-dashed border-border bg-(--surface) px-4 py-6 text-center text-sm text-(--text-3)">
                No published election results yet.
              </p>
            ) : (
              pastElectionSummaries.map((summary) => (
                <details key={summary.cycleId} className="rounded-(--r-md) border border-border bg-(--white)">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-(--text-1)">
                    {summary.title}
                  </summary>
                  <div className="space-y-2 border-t border-border px-4 py-3">
                    {summary.winners.map((winner) => (
                      <p key={`${summary.cycleId}-${winner.positionTitle}`} className="text-sm text-(--text-2)">
                        <span className="font-semibold text-(--text-1)">{winner.positionTitle}:</span>{" "}
                        {winner.winnerName} ({winner.voteCount} votes)
                      </p>
                    ))}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/voting/results/${summary.cycleId}`}>Full Results</Link>
                    </Button>
                  </div>
                </details>
              ))
            )}
          </div>
        </CardContent>
      </Card>

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
                  className="flex items-center justify-between gap-3 rounded-(--r-lg) border border-border p-3"
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
                          className="rounded-(--r-lg) border border-border bg-(--white) p-3"
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
              <div className="rounded-(--r-md) border border-border bg-(--white) px-3 py-2 text-xs font-semibold text-(--navy-900)">
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
