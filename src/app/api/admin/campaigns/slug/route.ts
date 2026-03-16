import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  isCampaignSlugAvailable,
  normalizeCampaignSlug,
} from "@/lib/admin-campaigns";

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const excludeId = url.searchParams.get("excludeId");
  const normalizedSlug = normalizeCampaignSlug(slug);

  if (normalizedSlug.length < 1) {
    return NextResponse.json({
      available: false,
      normalizedSlug,
    });
  }

  const available = await isCampaignSlugAvailable({
    slug: normalizedSlug,
    excludeId,
  });

  return NextResponse.json({
    available,
    normalizedSlug,
  });
}
