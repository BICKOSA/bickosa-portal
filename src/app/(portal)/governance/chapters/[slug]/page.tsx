import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { getChapterBySlug, getCountryFlagEmoji } from "@/lib/governance";

type ChapterDetailsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ChapterDetailsPage({ params }: ChapterDetailsPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const chapter = await getChapterBySlug(slug);
  if (!chapter) {
    notFound();
  }

  const flagEmoji = getCountryFlagEmoji(chapter.country);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title={`${flagEmoji} ${chapter.name}`}
        description={`${chapter.country}${chapter.city ? ` · ${chapter.city}` : ""} · Leader: ${chapter.leaderName ?? "To be announced"}`}
      />

      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-(--text-2)">
            {chapter.description ?? "No chapter description has been added yet."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chapter.foundedYear ? <Badge variant="outline">Founded {chapter.foundedYear}</Badge> : null}
            <Badge variant="outline">{chapter.memberCount.toLocaleString()} members</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chapter Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {chapter.events.length === 0 ? (
              <p className="text-sm text-(--text-3)">No upcoming chapter events.</p>
            ) : (
              chapter.events.map((event) => (
                <div key={event.id} className="rounded-(--r-lg) border border-(--border) p-3">
                  <p className="text-sm font-semibold text-(--text-1)">{event.title}</p>
                  <p className="mt-1 text-xs text-(--text-3)">
                    {new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short" }).format(
                      event.startAt,
                    )}
                    {event.locationName ? ` · ${event.locationName}` : event.isOnline ? " · Online" : ""}
                  </p>
                  <Link className="mt-2 inline-block text-xs text-(--navy-700) hover:underline" href={`/events/${event.slug}`}>
                    View event
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chapter Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {chapter.members.length === 0 ? (
              <p className="text-sm text-(--text-3)">No public members listed in this chapter.</p>
            ) : (
              chapter.members.map((member) => (
                <div key={member.profileId} className="rounded-(--r-lg) border border-(--border) p-3">
                  <Link href={`/directory/${member.profileId}`} className="text-sm font-semibold text-(--text-1) hover:underline">
                    {member.fullName}
                  </Link>
                  <p className="mt-1 text-xs text-(--text-3)">
                    {member.jobTitle ?? "Role not listed"}
                    {member.classYear ? ` · Class ${member.classYear}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
