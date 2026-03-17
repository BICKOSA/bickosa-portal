import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { getUserVerifiedMemberState, listVerifiedAlumniForNominationSearch } from "@/lib/committees";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isVerified = await getUserVerifiedMemberState(session.user.id, Boolean(session.user.emailVerified));
  if (!isVerified) {
    return NextResponse.json({ message: "Only verified members can nominate peers." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await listVerifiedAlumniForNominationSearch(query);
  return NextResponse.json({ results });
}
