import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listPollsForAdmin } from "@/lib/admin-polls";
import { db } from "@/lib/db";
import { chapters } from "@/lib/db/schema";

import { PollsAdminClient } from "./_components/polls-admin-client";

export default async function AdminPollsPage() {
  await requireAdminPageSession();
  const [polls, chapterRows] = await Promise.all([
    listPollsForAdmin(),
    db.select({ id: chapters.id, name: chapters.name }).from(chapters),
  ]);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Poll Management"
        description="Create and manage general polls, monitor participation, and publish results."
      />
      <PollsAdminClient polls={polls} chapters={chapterRows} />
    </section>
  );
}
