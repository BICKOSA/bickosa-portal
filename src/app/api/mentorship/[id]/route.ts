import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { trackPortalEvent } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { mentorshipRequests } from "@/lib/db/schema";
import { createNotification } from "@/lib/notifications/create-notification";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const mentorshipDecisionSchema = z
  .object({
    status: z.union([z.literal("accepted"), z.literal("declined")]),
    schedulingUrl: z.union([z.literal(""), z.url("Enter a valid scheduling URL.")]).optional(),
    mentorResponse: z
      .string()
      .trim()
      .max(180, "Response must be 180 characters or less.")
      .optional(),
  })
  .refine(
    (value) =>
      value.status !== "accepted" || value.schedulingUrl === undefined || Boolean(value.schedulingUrl.trim()),
    {
      path: ["schedulingUrl"],
      message: "Provide a scheduling URL when accepting with scheduling details.",
    },
  );

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const payload = mentorshipDecisionSchema.parse(await request.json());
    const { id } = await context.params;

    const existing = await db.query.mentorshipRequests.findFirst({
      where: eq(mentorshipRequests.id, id),
    });

    if (!existing) {
      return NextResponse.json({ message: "Mentorship request not found." }, { status: 404 });
    }

    if (existing.mentorId !== session.user.id) {
      return NextResponse.json(
        { message: "Only the mentor can respond to this request." },
        { status: 403 },
      );
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { message: "Only pending requests can be updated." },
        { status: 409 },
      );
    }

    const now = new Date();
    await db
      .update(mentorshipRequests)
      .set({
        status: payload.status,
        mentorResponse: payload.mentorResponse?.trim() || null,
        schedulingUrl: payload.schedulingUrl?.trim() || null,
        respondedAt: now,
      })
      .where(eq(mentorshipRequests.id, id));

    if (payload.status === "accepted") {
      const mentorDisplayName = session.user.name?.trim() || "Your mentor";
      await createNotification({
        userId: existing.menteeId,
        type: "mentorship_accepted",
        title: `${mentorDisplayName} accepted your request`,
        body: "Your mentorship request was accepted. Open your requests to view next steps.",
        actionUrl: "/mentorship/my-requests",
        idempotencyKey: `mentorship_accepted:${id}:${existing.menteeId}`,
      });

      await trackPortalEvent({
        event: "mentorship_request_accepted",
        userId: session.user.id,
        properties: {
          request_id: id,
        },
      });
    }

    return NextResponse.json({
      status: payload.status,
      respondedAt: now.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Failed to update mentorship request." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await db.query.mentorshipRequests.findFirst({
    where: eq(mentorshipRequests.id, id),
    columns: {
      id: true,
      menteeId: true,
      status: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Mentorship request not found." }, { status: 404 });
  }

  if (existing.menteeId !== session.user.id) {
    return NextResponse.json({ message: "Only the mentee can cancel this request." }, { status: 403 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { message: "Only pending requests can be cancelled." },
      { status: 409 },
    );
  }

  await db
    .update(mentorshipRequests)
    .set({
      status: "cancelled",
      respondedAt: new Date(),
    })
    .where(and(eq(mentorshipRequests.id, id), eq(mentorshipRequests.menteeId, session.user.id)));

  return NextResponse.json({ status: "cancelled" });
}
