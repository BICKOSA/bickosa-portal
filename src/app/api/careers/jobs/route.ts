import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import {
  createJobPosting,
  listApprovedActiveJobs,
  parseCreateJobPostingInput,
} from "@/lib/careers";
import { getViewerIsVerified } from "@/lib/directory";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const jobs = await listApprovedActiveJobs();
  return NextResponse.json({ data: jobs });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isVerifiedMember = await getViewerIsVerified(
    session.user.id,
    Boolean((session.user as { emailVerified?: boolean }).emailVerified),
  );

  if (!isVerifiedMember) {
    return NextResponse.json(
      { message: "Only verified members can post jobs." },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const parsed = parseCreateJobPostingInput(formData);

    const created = await createJobPosting({
      posterId: session.user.id,
      values: parsed,
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit job posting.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
