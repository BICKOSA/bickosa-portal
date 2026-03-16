import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { isEventSlugAvailable, normalizeEventSlug } from "@/lib/admin-events";

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const url = new URL(request.url);
  const slug = normalizeEventSlug(url.searchParams.get("slug") ?? "");
  const excludeId = (url.searchParams.get("excludeId") ?? "").trim() || null;

  if (!slug) {
    return NextResponse.json({ available: false, normalizedSlug: slug });
  }

  const available = await isEventSlugAvailable({
    slug,
    excludeEventId: excludeId,
  });

  return NextResponse.json({
    available,
    normalizedSlug: slug,
  });
}
