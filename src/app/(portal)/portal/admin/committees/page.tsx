import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listAdminCommittees } from "@/lib/committees";

import { CommitteesAdminClient } from "./_components/committees-admin-client";

export default async function AdminCommitteesPage() {
  await requireAdminPageSession();
  const committees = await listAdminCommittees();

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Committee Management"
        description="Create and govern ad-hoc committee nomination windows with transparent, read-only nomination records."
      />
      <CommitteesAdminClient committees={committees} />
    </section>
  );
}
