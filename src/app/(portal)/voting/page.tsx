import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CheckCircle2, Vote } from "lucide-react";

import { CountdownText } from "@/app/(portal)/voting/_components/countdown-text";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth/auth";
import { getVotingHubData } from "@/lib/voting";

function statusLabel(status: "nominations_open" | "voting_open") {
  return status === "nominations_open" ? "Nominations Open" : "Voting Open";
}

export default async function VotingHubPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { elections, polls } = await getVotingHubData(session.user.id);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="Voting Hub"
        description="Track open elections and active polls, then complete your nominations and votes."
      />
      <p className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] px-4 py-3 text-sm text-[var(--text-2)]">
        Your participation is recorded for quorum and audit purposes in accordance with Uganda&apos;s Data
        Protection and Privacy Act, 2019. Your specific ballot choice is kept confidential.
      </p>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Elections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {elections.length === 0 ? (
              <EmptyState
                title="No elections are currently open."
                className="border-dashed py-10 text-base text-[var(--text-3)] shadow-none"
              />
            ) : (
              elections.map((cycle) => {
                const isVotingOpen = cycle.status === "voting_open";
                const ctaLabel = isVotingOpen ? "Cast Your Vote" : "Submit Nomination";
                return (
                  <div
                    key={cycle.id}
                    className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-[var(--font-ui)] text-base font-semibold text-[var(--text-1)]">
                        {cycle.title}
                      </h3>
                      <Badge variant={isVotingOpen ? "gold" : "navy"}>{statusLabel(cycle.status)}</Badge>
                    </div>
                    <CountdownText
                      to={isVotingOpen ? cycle.votingCloses : cycle.nominationCloses}
                      className="mt-2 text-sm text-[var(--text-3)]"
                    />
                    <div className="mt-4">
                      {cycle.hasVotedAllPositions ? (
                        <div className="inline-flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--navy-100)] bg-[var(--navy-50)] px-3 py-2 text-sm text-[var(--navy-700)]">
                          <CheckCircle2 className="size-4" />
                          Vote Submitted
                        </div>
                      ) : (
                        <Button asChild variant="navy" size="sm">
                          <Link href={`/voting/elections/${cycle.id}`}>{ctaLabel}</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Polls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {polls.length === 0 ? (
              <EmptyState
                title="No polls are currently open."
                className="border-dashed py-10 text-base text-[var(--text-3)] shadow-none"
              />
            ) : (
              polls.map((poll) => (
                <div
                  key={poll.id}
                  className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-[var(--font-ui)] text-base font-semibold text-[var(--text-1)]">
                      {poll.title}
                    </h3>
                    <Badge variant="navy">{poll.pollType.replaceAll("_", " ")}</Badge>
                  </div>
                  {poll.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--text-2)]">{poll.description}</p>
                  ) : null}
                  <CountdownText to={poll.votingCloses} className="mt-2 text-sm text-[var(--text-3)]" />
                  <div className="mt-4">
                    <Button asChild variant="navy" size="sm">
                      <Link href={`/voting/polls/${poll.id}`}>
                        <Vote className="size-4" />
                        Vote Now
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
