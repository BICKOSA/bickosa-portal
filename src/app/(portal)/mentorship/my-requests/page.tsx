import { alias } from "drizzle-orm/pg-core";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  MyRequestsClient,
  type IncomingMentorshipRequest,
  type OutgoingMentorshipRequest,
} from "@/app/(portal)/mentorship/my-requests/_components/my-requests-client";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { alumniProfiles, mentorshipRequests } from "@/lib/db/schema";

async function getOutgoingRequests(userId: string): Promise<OutgoingMentorshipRequest[]> {
  const mentors = alias(alumniProfiles, "mentor_profiles");

  const rows = await db
    .select({
      id: mentorshipRequests.id,
      status: mentorshipRequests.status,
      field: mentorshipRequests.field,
      message: mentorshipRequests.message,
      mentorResponse: mentorshipRequests.mentorResponse,
      schedulingUrl: mentorshipRequests.schedulingUrl,
      createdAt: mentorshipRequests.createdAt,
      mentorFirstName: mentors.firstName,
      mentorLastName: mentors.lastName,
    })
    .from(mentorshipRequests)
    .innerJoin(mentors, eq(mentors.userId, mentorshipRequests.mentorId))
    .where(eq(mentorshipRequests.menteeId, userId))
    .orderBy(desc(mentorshipRequests.createdAt));

  return rows.map((row) => ({
    id: row.id,
    mentorName: `${row.mentorFirstName} ${row.mentorLastName}`.trim(),
    field: row.field,
    message: row.message,
    status: row.status,
    mentorResponse: row.mentorResponse,
    schedulingUrl: row.schedulingUrl,
    createdAt: row.createdAt.toISOString(),
  }));
}

async function getIncomingRequests(userId: string): Promise<IncomingMentorshipRequest[]> {
  const mentees = alias(alumniProfiles, "mentee_profiles");

  const rows = await db
    .select({
      id: mentorshipRequests.id,
      status: mentorshipRequests.status,
      field: mentorshipRequests.field,
      message: mentorshipRequests.message,
      createdAt: mentorshipRequests.createdAt,
      menteeFirstName: mentees.firstName,
      menteeLastName: mentees.lastName,
    })
    .from(mentorshipRequests)
    .innerJoin(mentees, eq(mentees.userId, mentorshipRequests.menteeId))
    .where(eq(mentorshipRequests.mentorId, userId))
    .orderBy(desc(mentorshipRequests.createdAt));

  return rows.map((row) => ({
    id: row.id,
    menteeName: `${row.menteeFirstName} ${row.menteeLastName}`.trim(),
    field: row.field,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export default async function MyMentorshipRequestsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const [outgoing, incoming] = await Promise.all([
    getOutgoingRequests(session.user.id),
    getIncomingRequests(session.user.id),
  ]);

  return (
    <section>
      <PageHeader
        eyebrow="Mentorship"
        title="My Requests"
        description="Track your outgoing requests and respond to incoming mentorship requests."
      />
      <MyRequestsClient initialOutgoing={outgoing} initialIncoming={incoming} />
    </section>
  );
}
