import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Award, PlayCircle, Vote } from "lucide-react";

import { CountdownText } from "@/app/(portal)/voting/_components/countdown-text";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth/auth";
import { isAdminUserRole } from "@/lib/auth/roles";
import { formatDate } from "@/lib/datetime";
import { getElectionCandidatesPageData } from "@/lib/voting";

type PageProps = {
  params: Promise<{ cycleId: string }>;
};

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function statusBadgeVariant(
  status: string,
): "outline" | "navy" | "gold" | "success" | "warning" {
  if (status === "voting_open") return "gold";
  if (status === "results_published") return "success";
  if (status === "voting_closed") return "warning";
  if (status === "nominations_open" || status === "nominations_closed") {
    return "navy";
  }
  return "outline";
}

export default async function ElectionCandidatesPage({ params }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const isAdmin = isAdminUserRole(
    (session.user as { role?: string }).role,
  );

  const { cycleId } = await params;
  const data = await getElectionCandidatesPageData(cycleId, { isAdmin });
  if (!data) {
    notFound();
  }

  const isVotingOpen = data.cycle.status === "voting_open";
  const cycleClosed =
    data.cycle.status === "voting_closed" ||
    data.cycle.status === "results_published";
  const canCastBallot = data.cycle.status === "voting_open";
  // Live tallies are public to all members during voting_open as well.
  const showResultsButton = isVotingOpen || cycleClosed || isAdmin;

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title={`${data.cycle.title} · Candidates`}
        description="Approved nominees per position. Open a card to read each candidate's manifesto."
      />

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{data.cycle.title}</CardTitle>
            <Badge variant={statusBadgeVariant(data.cycle.status)}>
              {statusLabel(data.cycle.status)}
            </Badge>
          </div>
          {data.cycle.description ? (
            <p className="text-sm text-[var(--text-2)]">
              {data.cycle.description}
            </p>
          ) : null}
          <div className="text-xs text-[var(--text-3)]">
            <p>
              Nominations: {formatDate(data.cycle.nominationOpens)} —{" "}
              {formatDate(data.cycle.nominationCloses)}
            </p>
            <p>
              Voting: {formatDate(data.cycle.votingOpens)} —{" "}
              {formatDate(data.cycle.votingCloses)}
            </p>
            {isVotingOpen ? (
              <CountdownText
                to={data.cycle.votingCloses}
                className="mt-1 text-[var(--text-2)]"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/voting/elections/${data.cycle.id}`}>
                <ArrowLeft className="size-4" /> Back to election
              </Link>
            </Button>
            {canCastBallot ? (
              <Button asChild variant="gold" size="sm">
                <Link href={`/voting/elections/${data.cycle.id}`}>
                  <Vote className="size-4" /> Cast your vote
                </Link>
              </Button>
            ) : null}
            {showResultsButton ? (
              <Button asChild variant="navy" size="sm">
                <Link href={`/voting/results/${data.cycle.id}`}>
                  <Award className="size-4" />{" "}
                  {isVotingOpen ? "Live results" : "View results"}
                </Link>
              </Button>
            ) : null}
            {data.cycle.liveStreamUrl ? (
              <Button asChild variant="gold" size="sm">
                <a
                  href={data.cycle.liveStreamUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <PlayCircle className="size-4" /> Watch live
                </a>
              </Button>
            ) : null}
          </div>
          {!data.cycle.resultsPublished && data.showVoteCounts ? (
            <p className="rounded-[var(--r-md)] border border-[var(--gold-300)] bg-[var(--gold-50)] px-3 py-2 text-xs text-[var(--gold-800)]">
              Admin preview — vote counts shown below are not yet visible to
              members.
            </p>
          ) : null}
        </CardHeader>
      </Card>

      {data.totalCandidates === 0 ? (
        <EmptyState
          title="No approved candidates yet"
          body="Approved nominations will appear here as admins review submissions."
          className="border-dashed py-12"
        />
      ) : (
        <div className="space-y-6">
          {data.positions.map((position) => (
            <Card key={position.positionId}>
              <CardHeader className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{position.positionTitle}</CardTitle>
                  <p className="text-xs text-[var(--text-3)]">
                    {position.candidates.length} candidate
                    {position.candidates.length === 1 ? "" : "s"}
                    {position.maxWinners > 1
                      ? ` · Top ${position.maxWinners} win`
                      : ""}
                    {data.showVoteCounts
                      ? ` · ${position.totalVotes.toLocaleString()} vote${position.totalVotes === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
                {position.positionDescription ? (
                  <p className="text-sm text-[var(--text-3)]">
                    {position.positionDescription}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {position.candidates.length === 0 ? (
                  <p className="rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text-3)]">
                    No approved candidates for this position yet.
                  </p>
                ) : (
                  position.candidates.map((candidate) => (
                    <article
                      key={candidate.nominationId}
                      className={`rounded-[var(--r-lg)] border p-4 ${
                        candidate.isWinner
                          ? "border-[var(--gold-500)] bg-[var(--gold-50)]"
                          : "border-[var(--border)] bg-[var(--white)]"
                      }`}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <Avatar
                          src={candidate.avatarUrl}
                          name={candidate.nomineeName}
                          size="md"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--navy-900)]">
                              {candidate.nomineeName}
                            </p>
                            {candidate.isWinner ? (
                              <Badge variant="gold">
                                <Award className="size-3" /> Winner
                              </Badge>
                            ) : null}
                            {candidate.isOffPlatform ? (
                              <Badge variant="outline">Off-platform</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-[var(--text-3)]">
                            {candidate.yearOfCompletion
                              ? `Class of ${candidate.yearOfCompletion}`
                              : "Alumni"}
                            {candidate.jobTitle
                              ? ` · ${candidate.jobTitle}${
                                  candidate.employer
                                    ? ` at ${candidate.employer}`
                                    : ""
                                }`
                              : ""}
                          </p>
                        </div>
                        {data.showVoteCounts && candidate.voteCount !== null ? (
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums text-[var(--navy-900)]">
                              {candidate.voteCount.toLocaleString()} votes
                            </p>
                            {candidate.percentage !== null ? (
                              <p className="text-xs text-[var(--text-3)]">
                                {candidate.percentage}%
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {data.showVoteCounts &&
                      candidate.percentage !== null ? (
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--navy-50)]">
                          <div
                            className="h-full rounded-full bg-[var(--navy-700)]"
                            style={{
                              width: `${Math.max(2, candidate.percentage)}%`,
                            }}
                          />
                        </div>
                      ) : null}

                      {candidate.manifesto ? (
                        <details className="mt-3 text-sm text-[var(--text-2)]">
                          <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-wide text-[var(--navy-700)]">
                            Read manifesto
                          </summary>
                          <p className="mt-2 whitespace-pre-line">
                            {candidate.manifesto}
                          </p>
                        </details>
                      ) : (
                        <p className="mt-3 text-xs text-[var(--text-3)]">
                          No manifesto submitted yet.
                        </p>
                      )}
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
