import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listPendingJobPostingsForAdmin } from "@/lib/careers";
import { AdminCareersTable } from "@/app/(portal)/portal/admin/careers/_components/admin-careers-table";

export default async function AdminCareersPage() {
  await requireAdminPageSession();
  const pendingJobs = await listPendingJobPostingsForAdmin();

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Careers Moderation"
        description="Review pending job postings and publish approved opportunities."
      />
      <AdminCareersTable jobs={pendingJobs} />
    </section>
  );
}
