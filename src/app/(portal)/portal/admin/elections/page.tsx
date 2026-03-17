import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  getElectionResultsForAdmin,
  getElectionTurnoutStats,
  listElectionCyclesForAdmin,
  listElectionPositions,
  listNominationsForAdmin,
} from "@/lib/admin-elections";

import { ElectionsAdminClient } from "./_components/elections-admin-client";

export default async function AdminElectionsPage() {
  const session = await requireAdminPageSession();
  const cycles = await listElectionCyclesForAdmin();
  const primaryCycle = cycles[0];

  const [positions, nominations, turnout, results] = primaryCycle
    ? await Promise.all([
        listElectionPositions(primaryCycle.id),
        listNominationsForAdmin({ cycleId: primaryCycle.id, status: null, positionId: null }),
        getElectionTurnoutStats(primaryCycle.id),
        getElectionResultsForAdmin(primaryCycle.id),
      ])
    : [[], [], null, []];

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Election Management"
        description="Manage election cycles, nominations, turnout, and publishing of official results."
      />
      <ElectionsAdminClient
        adminUserId={session.user.id}
        cycles={cycles}
        initialCycleId={primaryCycle?.id ?? null}
        initialPositions={positions}
        initialNominations={nominations}
        initialTurnout={turnout}
        initialResults={results}
      />
    </section>
  );
}
