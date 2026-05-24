import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listChaptersForAnnouncements } from "@/lib/announcements";

import { ComposeAnnouncementForm } from "../_components/compose-announcement-form";

export default async function NewAnnouncementPage() {
  await requireAdminPageSession();
  const chapters = await listChaptersForAnnouncements();

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Compose announcement"
        description="Draft your message, pick the audience and channels, then send."
      />
      <ComposeAnnouncementForm
        chapters={chapters.map((chapter) => ({
          id: chapter.id,
          name: chapter.name,
        }))}
      />
    </section>
  );
}
