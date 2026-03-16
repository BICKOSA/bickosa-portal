import { notFound } from "next/navigation";

import { EventForm } from "@/app/(portal)/portal/admin/events/_components/event-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminEventById, listChapterOptions } from "@/lib/admin-events";

type EditAdminEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAdminEventPage({ params }: EditAdminEventPageProps) {
  await requireAdminPageSession();
  const { id } = await params;

  const [event, chapterOptions] = await Promise.all([getAdminEventById(id), listChapterOptions()]);

  if (!event) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Edit Event"
        description="Update event details, publishing status, and RSVP configuration."
      />
      <Card>
        <CardContent className="p-5">
          <EventForm mode="edit" event={event} chapterOptions={chapterOptions} />
        </CardContent>
      </Card>
    </section>
  );
}
