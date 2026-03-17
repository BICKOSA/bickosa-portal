import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { getElectionResultsForAdmin } from "@/lib/admin-elections";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApiSession();
  if (error) return error;

  const { cycleId } = await context.params;
  const rows = await getElectionResultsForAdmin(cycleId);
  return NextResponse.json(rows);
}
