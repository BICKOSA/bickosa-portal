import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listAdminCohorts } from "@/lib/alumni-growth";
import { CohortsAdminClient } from "@/app/(portal)/portal/admin/cohorts/_components/cohorts-admin-client";

export default async function AdminCohortsPage() {
  await requireAdminPageSession();
  const rows = await listAdminCohorts();

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Cohort Management"
        description="Assign cohort representatives for each graduation year group."
      />
      <CohortsAdminClient rows={rows} />
    </section>
  );
}
