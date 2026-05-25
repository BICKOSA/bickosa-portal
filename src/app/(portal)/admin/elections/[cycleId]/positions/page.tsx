import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listElectionCyclesForAdmin, listElectionPositions } from "@/lib/admin-elections";

import { ElectionPositionsClient } from "./positions-client";

type PageProps = {
  params: Promise<{ cycleId: string }>;
};

export default async function ElectionPositionsPage({ params }: PageProps) {
  await requireAdminPageSession();
  const { cycleId } = await params;

  const [cycles, positions] = await Promise.all([
    listElectionCyclesForAdmin(),
    listElectionPositions(cycleId),
  ]);

  const cycle = cycles.find((entry) => entry.id === cycleId);
  if (!cycle) {
    return (
      <section className="space-y-4">
        <PageHeader eyebrow="Administration" title="Election Positions" />
        <p className="text-sm text-(--text-3)">Election cycle not found.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeader
          eyebrow="Administration"
          title={`Positions — ${cycle.title}`}
          description="Add, edit, delete, and reorder election positions."
        />
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/elections">Back to Elections</Link>
        </Button>
      </div>
      <ElectionPositionsClient cycleId={cycle.id} positions={positions} />
    </section>
  );
}
