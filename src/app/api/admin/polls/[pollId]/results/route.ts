import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { getPollResultsForAdmin } from "@/lib/admin-polls";

type RouteContext = {
  params: Promise<{ pollId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApiSession();
  if (error) return error;

  const { pollId } = await context.params;
  const data = await getPollResultsForAdmin(pollId);
  if (!data) {
    return NextResponse.json({ message: "Poll not found." }, { status: 404 });
  }

  return NextResponse.json({
    pollId: data.poll.id,
    title: data.poll.title,
    isAnonymous: data.poll.isAnonymous,
    aggregate: data.aggregate,
    participationCount: data.total,
  });
}
