import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";

import { ElectionBallotClient } from "@/app/(portal)/voting/_components/election-ballot-client";
import { ElectionNominationsClient } from "@/app/(portal)/voting/_components/election-nominations-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { getElectionCyclePageData } from "@/lib/voting";

type PageProps = {
  params: Promise<{ cycleId: string }>;
};

function formatWindow(start: Date, end: Date): string {
  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}

export default async function ElectionCyclePage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { cycleId } = await params;
  const data = await getElectionCyclePageData(cycleId, session.user.id);
  if (!data) {
    notFound();
  }

  const nominationsByPosition = Object.fromEntries(data.nominationsByPosition.entries());
  const existingVotesByPosition = Object.fromEntries(
    data.viewerVotes.map((vote) => [vote.positionId, vote.nomineeId]),
  );

  return (
    <section className="space-y-5">
      <p className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] px-4 py-3 text-sm text-[var(--text-2)]">
        Your participation is recorded for quorum and audit purposes in accordance with Uganda&apos;s Data
        Protection and Privacy Act, 2019. Your specific ballot choice is kept confidential.
      </p>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{data.cycle.title}</CardTitle>
            <Badge variant={data.cycle.status === "voting_open" ? "gold" : "navy"}>
              {data.cycle.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <div className="text-sm text-[var(--text-3)]">
            <p>Nominations: {formatWindow(data.cycle.nominationOpens, data.cycle.nominationCloses)}</p>
            <p>Voting: {formatWindow(data.cycle.votingOpens, data.cycle.votingCloses)}</p>
          </div>
          {data.cycle.description ? <p className="text-sm text-[var(--text-2)]">{data.cycle.description}</p> : null}
        </CardHeader>
        <CardContent>
          {data.cycle.status === "nominations_open" ? (
            <ElectionNominationsClient
              positions={data.positions.map((position) => ({
                id: position.id,
                title: position.title,
                description: position.description,
              }))}
              nominationsByPosition={nominationsByPosition}
              viewerNominations={data.viewerNominations}
              alumniCandidates={data.alumniCandidates}
              viewerId={session.user.id}
              isVerified={data.isVerified}
            />
          ) : data.cycle.status === "voting_open" ? (
            <ElectionBallotClient
              cycleId={data.cycle.id}
              positions={data.positions.map((position) => ({
                id: position.id,
                title: position.title,
              }))}
              candidatesByPosition={nominationsByPosition}
              existingVotesByPosition={existingVotesByPosition}
              isVerified={data.isVerified}
            />
          ) : (
            <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] px-5 py-12 text-center">
              <p className="text-base text-[var(--text-3)]">
                This election is not currently in nomination or voting phase.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
