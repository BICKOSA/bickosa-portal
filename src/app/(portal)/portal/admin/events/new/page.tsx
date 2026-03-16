import { EventForm } from "@/app/(portal)/portal/admin/events/_components/event-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listChapterOptions } from "@/lib/admin-events";

export default async function NewAdminEventPage() {
  await requireAdminPageSession();
  const chapterOptions = await listChapterOptions();

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Create Event"
        description="Add a new event draft or publish immediately."
      />
      <Card>
        <CardContent className="p-5">
          <EventForm mode="create" chapterOptions={chapterOptions} />
        </CardContent>
      </Card>
    </section>
  );
}
