import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  archiveEventById,
  cancelRegistrationsForEvent,
  getAdminEventById,
  isEventSlugAvailable,
  maybeUploadEventBanner,
  parseAdminEventFormInput,
} from "@/lib/admin-events";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchJsonSchema = z.object({
  isPublished: z.boolean().optional(),
  action: z.enum(["archive"]).optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await context.params;
  const event = await getAdminEventById(id);
  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ data: event });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getAdminEventById(id);
  if (!existing) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload = patchJsonSchema.parse(await request.json());
      if (payload.action === "archive") {
        await archiveEventById(id);
        return NextResponse.json({ id, archived: true });
      }
      await db
        .update(events)
        .set({
          isPublished: payload.isPublished ?? existing.isPublished,
          updatedAt: new Date(),
        })
        .where(eq(events.id, id));

      return NextResponse.json({ id });
    }

    const formData = await request.formData();
    const input = parseAdminEventFormInput(formData);
    const slugAvailable = await isEventSlugAvailable({
      slug: input.slug,
      excludeEventId: id,
    });
    if (!slugAvailable) {
      return NextResponse.json(
        { message: "An event with this slug already exists. Choose another slug." },
        { status: 409 },
      );
    }
    const bannerFile = formData.get("bannerImage");
    const uploadedBannerKey = await maybeUploadEventBanner({
      file: bannerFile instanceof File ? bannerFile : null,
      userId: authResult.session.user.id,
    });

    await db
      .update(events)
      .set({
        title: input.title,
        slug: input.slug,
        description: input.description,
        type: input.type,
        startAt: input.startAt,
        endAt: input.endAt,
        timezone: input.timezone,
        locationName: input.locationName,
        locationAddress: input.locationAddress,
        locationCity: input.locationCity,
        isOnline: input.isOnline,
        onlineUrl: input.onlineUrl,
        bannerKey: uploadedBannerKey ?? existing.bannerKey,
        bannerColor: input.bannerColor,
        rsvpDeadline: input.rsvpDeadline,
        maxAttendees: input.maxAttendees,
        isFeatured: input.isFeatured,
        isPublished: input.isPublished,
        chapterId: input.chapterId,
        ticketPrice: input.ticketPrice,
        currency: input.currency,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id));

    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update event.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await context.params;
  const existing = await getAdminEventById(id);
  if (!existing) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  await cancelRegistrationsForEvent(id);
  await db.delete(events).where(eq(events.id, id));

  return NextResponse.json({ ok: true });
}
