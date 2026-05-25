import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listCommitteeNominationsForAdmin } from "@/lib/committees";
import { db } from "@/lib/db";
import { committees } from "@/lib/db/schema";

import { CommitteeNominationsDashboardClient } from "./_components/committee-nominations-dashboard-client";

type PageProps = {
  params: Promise<{ committeeId: string }>;
};

export default async function AdminCommitteeNominationsPage({ params }: PageProps) {
  await requireAdminPageSession();
  const { committeeId } = await params;

  const committee = await db.query.committees.findFirst({
    where: eq(committees.id, committeeId),
  });
  if (!committee) {
    notFound();
  }

  const rows = await listCommitteeNominationsForAdmin({
    committeeId,
    status: null,
  });

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title={`${committee.name} · Nominations Dashboard`}
        description="Real-time, read-only nomination stream with appointment workflow and audit exports."
      />
      <CommitteeNominationsDashboardClient
        committeeId={committee.id}
        committeeName={committee.name}
        maxMembers={committee.maxMembers}
        initialRows={rows}
      />
    </section>
  );
}
