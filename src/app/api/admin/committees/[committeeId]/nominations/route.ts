import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { listCommitteeNominationsForAdmin } from "@/lib/committees";

type RouteContext = {
  params: Promise<{ committeeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { committeeId } = await context.params;
  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw === "pending" ||
    statusRaw === "confirmed_willing" ||
    statusRaw === "declined" ||
    statusRaw === "appointed"
      ? statusRaw
      : null;

  const rows = await listCommitteeNominationsForAdmin({
    committeeId,
    status,
  });
  return NextResponse.json({ rows });
}
