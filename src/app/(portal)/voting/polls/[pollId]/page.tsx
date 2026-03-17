import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PollVoteClient } from "@/app/(portal)/voting/_components/poll-vote-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { getPollPageData } from "@/lib/voting";

type PageProps = {
  params: Promise<{ pollId: string }>;
};

function toOptionArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export default async function PollPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { pollId } = await params;
  const data = await getPollPageData(pollId, session.user.id);
  if (!data) {
    notFound();
  }

  const options = toOptionArray(data.poll.options);

  return (
    <section className="space-y-5">
      <p className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] px-4 py-3 text-sm text-[var(--text-2)]">
        Your participation is recorded for quorum and audit purposes in accordance with Uganda's Data
        Protection and Privacy Act, 2019. Your specific ballot choice is kept confidential.
      </p>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{data.poll.title}</CardTitle>
            <Badge variant="navy">{data.poll.pollType.replaceAll("_", " ")}</Badge>
          </div>
          {data.poll.description ? <p className="text-sm text-[var(--text-2)]">{data.poll.description}</p> : null}
          <p className="text-sm text-[var(--text-3)]">
            This poll requires {data.poll.quorumPercent}% participation to be binding.
          </p>
          {data.poll.isAnonymous ? (
            <p className="text-sm text-[var(--text-3)]">Your vote will not be attributed to you.</p>
          ) : (
            <p className="text-sm text-[var(--text-3)]">
              This is a non-anonymous poll. Your choice may be attributable for accountability.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <PollVoteClient
            pollId={data.poll.id}
            pollType={data.poll.pollType}
            options={options}
            existingChoice={data.existingVote?.choice ?? null}
            resultsPublished={data.poll.resultsPublished}
            results={data.results}
          />
        </CardContent>
      </Card>
    </section>
  );
}
