import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RequestMentorForm } from "@/app/(portal)/mentorship/[mentorId]/request/_components/request-mentor-form";
import { PageHeader } from "@/components/layout/page-header";
import { MentorCard } from "@/components/portal/mentor-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { countPendingMenteeRequests, getMentorByUserId } from "@/lib/mentorship";

type MentorRequestPageProps = {
  params: Promise<{ mentorId: string }>;
};

export default async function MentorRequestPage({ params }: MentorRequestPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { mentorId } = await params;
  if (mentorId === session.user.id) {
    redirect("/mentorship");
  }

  const [mentor, pendingMenteeRequests] = await Promise.all([
    getMentorByUserId({
      mentorUserId: mentorId,
      viewerUserId: session.user.id,
    }),
    countPendingMenteeRequests(session.user.id),
  ]);

  if (!mentor) {
    return (
      <section>
        <PageHeader
          eyebrow="Mentorship"
          title="Request Mentorship"
          description="This mentor is not currently available."
        />
        <Button asChild variant="outline">
          <Link href="/mentorship">Back to Mentors</Link>
        </Button>
      </section>
    );
  }

  const blockedByRateLimit = pendingMenteeRequests >= 3;

  return (
    <section>
      <PageHeader
        eyebrow="Mentorship"
        title={`Request mentorship from ${mentor.fullName}`}
        description="Share a clear context so your mentor can respond quickly and effectively."
      />

      <div className="mb-5 max-w-xl">
        <MentorCard
          mentorId={mentor.userId}
          fullName={mentor.fullName}
          avatarUrl={mentor.avatarUrl}
          jobTitle={mentor.jobTitle}
          classYear={mentor.classYear}
          focusAreas={mentor.focusAreas}
          pendingRequestCount={mentor.pendingRequestCount}
          hasPendingRequestFromViewer={mentor.hasPendingRequestFromViewer}
          showRequestButton={false}
        />
      </div>

      <Card className="max-w-2xl">
        <CardContent className="py-5">
          {blockedByRateLimit ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-2)]">
                You already have 3 pending mentorship requests. Cancel one from My Requests before
                sending a new request.
              </p>
              <Button asChild variant="outline">
                <Link href="/mentorship/my-requests">Go to My Requests</Link>
              </Button>
            </div>
          ) : (
            <RequestMentorForm mentorId={mentor.userId} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
