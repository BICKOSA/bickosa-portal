import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { VotingBanner } from "@/components/voting/voting-banner";
import { db } from "@/lib/db";
import { electionCycles, generalPolls } from "@/lib/db/schema";

type CycleStatus = "nominations_open" | "voting_open";

function formatList(titles: string[]): string {
  if (titles.length === 1) return titles[0];
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

export async function ActiveVotingBanner() {
  let cycles: Array<{ id: string; title: string; status: CycleStatus }> = [];
  let pollCount = 0;

  try {
    const now = new Date();
    const [cycleRows, polls] = await Promise.all([
      db
        .select({
          id: electionCycles.id,
          title: electionCycles.title,
          status: electionCycles.status,
        })
        .from(electionCycles)
        .where(
          inArray(electionCycles.status, ["nominations_open", "voting_open"]),
        )
        .orderBy(asc(electionCycles.votingOpens)),
      db
        .select({ id: generalPolls.id })
        .from(generalPolls)
        .where(
          and(
            eq(generalPolls.status, "open"),
            sql`${generalPolls.votingOpens} <= ${now}`,
            sql`${generalPolls.votingCloses} >= ${now}`,
          ),
        ),
    ]);

    cycles = cycleRows.filter(
      (row): row is { id: string; title: string; status: CycleStatus } =>
        row.status === "nominations_open" || row.status === "voting_open",
    );
    pollCount = polls.length;
  } catch {
    return null;
  }

  if (cycles.length === 0 && pollCount === 0) {
    return null;
  }

  const nominationsCycles = cycles.filter((c) => c.status === "nominations_open");
  const votingCycles = cycles.filter((c) => c.status === "voting_open");

  const sentences: string[] = [];
  if (nominationsCycles.length > 0) {
    sentences.push(
      `Nominations are open for ${formatList(nominationsCycles.map((c) => c.title))}`,
    );
  }
  if (votingCycles.length > 0) {
    sentences.push(
      `Voting is open for ${formatList(votingCycles.map((c) => c.title))}`,
    );
  }
  if (pollCount > 0) {
    sentences.push(
      pollCount === 1 ? "a community poll needs your vote" : `${pollCount} community polls need your vote`,
    );
  }
  const message = `${sentences.join(" · ")}.`;

  const ctaLabel =
    votingCycles.length > 0 || pollCount > 0
      ? "Cast your vote →"
      : "Submit a nomination →";

  const bannerKey =
    cycles
      .map((c) => `${c.id}:${c.status}`)
      .sort()
      .join("|") + `#polls:${pollCount}`;

  return (
    <VotingBanner
      storageKey={`bickosa.votingBannerDismissed:${bannerKey}`}
      message={message}
      ctaLabel={ctaLabel}
      ctaHref="/voting"
    />
  );
}
