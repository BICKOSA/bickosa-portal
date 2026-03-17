import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";

import MentorshipLoading from "@/app/(portal)/mentorship/loading";
import { PageHeader } from "@/components/layout/page-header";
import { MentorCard } from "@/components/portal/mentor-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { trackPortalEvent } from "@/lib/analytics/server";
import { auth } from "@/lib/auth/auth";
import { listMentors, normalizeMentorshipQuery, type MentorshipFieldFilter } from "@/lib/mentorship";

type MentorshipPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const mentorTabs: Array<{ label: string; field: MentorshipFieldFilter }> = [
  { label: "All Mentors", field: "all" },
  { label: "Technology", field: "Technology" },
  { label: "Healthcare", field: "Healthcare" },
  { label: "Law & Finance", field: "law-finance" },
  { label: "Education", field: "Education" },
  { label: "Engineering", field: "Engineering" },
];

async function MentorshipContent({
  userId,
  query,
}: {
  userId: string;
  query: ReturnType<typeof normalizeMentorshipQuery>;
}) {
  const mentors = await listMentors({
    query,
    viewerUserId: userId,
  });

  await trackPortalEvent({
    event: "mentor_browse",
    userId,
    properties: {
      filter_field: query.field,
    },
  });

  if (mentors.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="No mentors found in this field"
        body="Be the first! Sign up as a mentor."
        action={
          <Button asChild variant="navy">
            <Link href="/mentorship/become-mentor">Become a Mentor</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div id="mentors" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {mentors.map((mentor) => (
        <MentorCard
          key={mentor.userId}
          mentorId={mentor.userId}
          fullName={mentor.fullName}
          avatarUrl={mentor.avatarUrl}
          jobTitle={mentor.jobTitle}
          classYear={mentor.classYear}
          focusAreas={mentor.focusAreas}
          pendingRequestCount={mentor.pendingRequestCount}
          hasPendingRequestFromViewer={mentor.hasPendingRequestFromViewer}
        />
      ))}
    </div>
  );
}

export default async function MentorshipPage({ searchParams }: MentorshipPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const query = normalizeMentorshipQuery(resolvedParams);
  return (
    <section>
      <PageHeader
        eyebrow="Community"
        title="Mentorship"
        description="Share your expertise with fellow alumni or connect with someone who can guide your next step."
      />

      <Card variant="navy-tint" accentBar className="mb-6">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-(--navy-900)">
              Share your experience
            </h3>
            <p className="mt-1 text-sm text-(--text-2)">
              Help younger alumni grow through practical guidance and career conversations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="navy">
              <Link href="/mentorship/become-mentor">Become a Mentor</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="#mentors">Find a Mentor</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/mentorship/my-requests">My Requests</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-5 flex flex-wrap gap-2">
        {mentorTabs.map((tab) => {
          const isActive = query.field === tab.field;
          const nextParams = new URLSearchParams();
          if (tab.field !== "all") {
            nextParams.set("field", tab.field);
          }
          const href = nextParams.toString() ? `/mentorship?${nextParams.toString()}` : "/mentorship";

          return (
            <Button key={tab.field} asChild variant={isActive ? "navy" : "outline"} size="sm">
              <Link href={href}>{tab.label}</Link>
            </Button>
          );
        })}
      </div>

      <Suspense fallback={<MentorshipLoading />}>
        <MentorshipContent userId={session.user.id} query={query} />
      </Suspense>
    </section>
  );
}
