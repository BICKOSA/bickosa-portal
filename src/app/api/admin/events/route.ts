import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  listAdminEvents,
  maybeUploadEventBanner,
  normalizeAdminEventsListQuery,
  isEventSlugAvailable,
  parseAdminEventFormInput,
} from "@/lib/admin-events";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const url = new URL(request.url);
  const query = normalizeAdminEventsListQuery(url.searchParams);
  const allEvents = await listAdminEvents(query);
  return NextResponse.json(allEvents);
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const input = parseAdminEventFormInput(formData);
    const slugAvailable = await isEventSlugAvailable({ slug: input.slug });
    if (!slugAvailable) {
      return NextResponse.json(
        { message: "An event with this slug already exists. Choose another slug." },
        { status: 409 },
      );
    }
    const bannerFile = formData.get("bannerImage");
    const bannerKey = await maybeUploadEventBanner({
      file: bannerFile instanceof File ? bannerFile : null,
      userId: authResult.session.user.id,
    });

    const [created] = await db
      .insert(events)
      .values({
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
        bannerKey,
        bannerColor: input.bannerColor,
        rsvpDeadline: input.rsvpDeadline,
        maxAttendees: input.maxAttendees,
        isFeatured: input.isFeatured,
        isPublished: input.isPublished,
        organizerId: authResult.session.user.id,
        chapterId: input.chapterId,
        ticketPrice: input.ticketPrice,
        currency: input.currency,
      })
      .returning({
        id: events.id,
      });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
