import { and, eq, inArray, sql } from "drizzle-orm";

import { VotingBanner } from "@/components/voting/voting-banner";
import { db } from "@/lib/db";
import { electionCycles, generalPolls } from "@/lib/db/schema";

export async function ActiveVotingBanner() {
  let cycleCount = 0;
  let pollCount = 0;
  let bannerKey = "none";

  try {
    const now = new Date();
    const [cycles, polls] = await Promise.all([
      db
        .select({
          id: electionCycles.id,
          status: electionCycles.status,
        })
        .from(electionCycles)
        .where(
          inArray(electionCycles.status, ["nominations_open", "voting_open"]),
        ),
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

    cycleCount = cycles.length;
    pollCount = polls.length;

    const cycleKey = cycles
      .map((c) => `${c.id}:${c.status}`)
      .sort()
      .join("|");
    const pollKey = polls
      .map((p) => p.id)
      .sort()
      .join("|");
    bannerKey = `${cycleKey}#${pollKey}` || "none";
  } catch {
    /* DB unavailable — render nothing rather than break the layout. */
    return null;
  }

  if (cycleCount === 0 && pollCount === 0) {
    return null;
  }

  const parts: string[] = [];
  if (cycleCount > 0) {
    parts.push(
      cycleCount === 1
        ? "An election is open"
        : `${cycleCount} elections are open`,
    );
  }
  if (pollCount > 0) {
    parts.push(
      pollCount === 1 ? "a poll needs your vote" : `${pollCount} polls need your vote`,
    );
  }
  const message = `${parts.join(" and ")}.`;

  return (
    <VotingBanner
      storageKey={`bickosa.votingBannerDismissed:${bannerKey}`}
      message={message}
      ctaLabel="Cast your vote →"
      ctaHref="/voting"
    />
  );
}
