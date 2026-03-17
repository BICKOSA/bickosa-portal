import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { committeeNominations, committees, users } from "@/lib/db/schema";

import { CommitteeRespondClient } from "../../../_components/committee-respond-client";

type PageProps = {
  params: Promise<{ committeeId: string; nominationId: string }>;
};

export default async function RespondCommitteeNominationPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { committeeId, nominationId } = await params;
  const nomination = await db
    .select({
      id: committeeNominations.id,
      committeeId: committeeNominations.committeeId,
      nomineeId: committeeNominations.nomineeId,
      status: committeeNominations.status,
      reason: committeeNominations.reason,
      committeeName: committees.name,
      nominatedByName: users.name,
    })
    .from(committeeNominations)
    .innerJoin(committees, eq(committees.id, committeeNominations.committeeId))
    .innerJoin(users, eq(users.id, committeeNominations.nominatedById))
    .where(and(eq(committeeNominations.id, nominationId), eq(committeeNominations.committeeId, committeeId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!nomination) {
    notFound();
  }

  if (nomination.nomineeId !== session.user.id) {
    redirect(`/committees/${committeeId}`);
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Nomination Response"
        title={nomination.committeeName}
        description={`You were nominated by ${nomination.nominatedByName}.`}
      />
      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-sm font-semibold text-(--text-1)">Nomination reason</h3>
        <p className="mt-2 text-sm text-(--text-2)">{nomination.reason ?? "No reason provided."}</p>
      </div>
      <CommitteeRespondClient nominationId={nomination.id} initialStatus={nomination.status} />
    </section>
  );
}
