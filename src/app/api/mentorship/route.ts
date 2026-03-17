import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { trackPortalEvent } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { alumniProfiles, mentorshipRequests, privacySettings, users } from "@/lib/db/schema";
import { sendMentorshipRequestEmail } from "@/lib/email/resend";
import {
  countPendingMenteeRequests,
  getMentorByUserId,
  listMentors,
  normalizeMentorshipQuery,
} from "@/lib/mentorship";
import { createNotification } from "@/lib/notifications/create-notification";
import { checkRateLimit } from "@/lib/rate-limit";

const MENTORSHIP_RATE_LIMIT = {
  maxRequests: 25,
  windowMs: 60_000,
} as const;

const createMentorshipRequestSchema = z.object({
  mentorId: z.uuid("Invalid mentor id."),
  field: z.string().trim().min(2, "Field/topic is required."),
  message: z
    .string()
    .trim()
    .min(140, "Message must be at least 140 characters.")
    .max(280, "Message must be at most 280 characters."),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`mentorship:list:${session.user.id}`, MENTORSHIP_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const url = new URL(request.url);
  const query = normalizeMentorshipQuery(url.searchParams);
  const mentors = await listMentors({
    query,
    viewerUserId: session.user.id,
  });

  return NextResponse.json({
    data: mentors,
    total: mentors.length,
    filters: query,
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const payload = createMentorshipRequestSchema.parse(await request.json());
    if (payload.mentorId === session.user.id) {
      return NextResponse.json(
        { message: "You cannot request mentorship from yourself." },
        { status: 400 },
      );
    }

    const [mentor, menteePendingCount, mentorPendingCountRow, existingRequest] = await Promise.all([
      getMentorByUserId({
        mentorUserId: payload.mentorId,
        viewerUserId: session.user.id,
      }),
      countPendingMenteeRequests(session.user.id),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(mentorshipRequests)
        .where(
          and(
            eq(mentorshipRequests.mentorId, payload.mentorId),
            eq(mentorshipRequests.status, "pending"),
          ),
        )
        .then((rows) => rows[0]),
      db.query.mentorshipRequests.findFirst({
        where: and(
          eq(mentorshipRequests.mentorId, payload.mentorId),
          eq(mentorshipRequests.menteeId, session.user.id),
          eq(mentorshipRequests.status, "pending"),
        ),
        columns: { id: true },
      }),
    ]);

    if (!mentor) {
      return NextResponse.json({ message: "Mentor not found." }, { status: 404 });
    }

    if (menteePendingCount >= 3) {
      return NextResponse.json(
        { message: "You already have 3 pending mentorship requests." },
        { status: 409 },
      );
    }

    if ((mentorPendingCountRow?.value ?? 0) >= 3) {
      return NextResponse.json({ message: "This mentor is fully booked." }, { status: 409 });
    }

    if (existingRequest) {
      return NextResponse.json(
        { message: "You already have a pending request with this mentor." },
        { status: 409 },
      );
    }

    const [createdRequest] = await db
      .insert(mentorshipRequests)
      .values({
        mentorId: payload.mentorId,
        menteeId: session.user.id,
        field: payload.field,
        message: payload.message,
        status: "pending",
      })
      .returning({
        id: mentorshipRequests.id,
        createdAt: mentorshipRequests.createdAt,
      });

    const [mentorUser, requesterProfile, mentorUserProfile] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, payload.mentorId),
        columns: {
          email: true,
        },
      }),
      db.query.alumniProfiles.findFirst({
        where: eq(alumniProfiles.userId, session.user.id),
        columns: {
          firstName: true,
          lastName: true,
          yearOfCompletion: true,
        },
      }),
      db.query.alumniProfiles.findFirst({
        where: eq(alumniProfiles.userId, payload.mentorId),
        columns: {
          yearOfCompletion: true,
        },
      }),
    ]);

    const requesterName = requesterProfile
      ? `${requesterProfile.firstName} ${requesterProfile.lastName}`.trim()
      : (session.user.name ?? "A BICKOSA member");

    const mentorPrivacy = await db.query.privacySettings.findFirst({
      where: eq(privacySettings.userId, payload.mentorId),
      columns: {
        receiveMentorshipNotifications: true,
      },
    });

    if (mentorPrivacy?.receiveMentorshipNotifications ?? true) {
      await createNotification({
        userId: payload.mentorId,
        type: "mentorship_request",
        title: `${requesterName} wants you as a mentor`,
        body: `${requesterName} sent you a mentorship request in ${payload.field}.`,
        actionUrl: "/mentorship/my-requests",
        idempotencyKey: `mentorship_request:${createdRequest.id}:${payload.mentorId}`,
      });
    }

    await trackPortalEvent({
      event: "mentorship_request_sent",
      userId: session.user.id,
      properties: {
        mentor_class: mentorUserProfile?.yearOfCompletion ?? "unknown",
        mentee_class: requesterProfile?.yearOfCompletion ?? "unknown",
        field: payload.field,
      },
    });

    if (mentorUser?.email) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.bickosa.org").replace(
        /\/$/,
        "",
      );
      try {
        await sendMentorshipRequestEmail({
          to: mentorUser.email,
          mentorName: mentor.fullName,
          requesterName,
          messagePreview: payload.message.slice(0, 160),
          requestUrl: `${appUrl}/mentorship/my-requests`,
        });
      } catch (error) {
        console.error("Failed to send mentorship request email", error);
      }
    }

    return NextResponse.json(
      {
        request: createdRequest,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Failed to create mentorship request." },
      { status: 500 },
    );
  }
}
