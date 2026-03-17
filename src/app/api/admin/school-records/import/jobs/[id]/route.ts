import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { getSchoolRecordImportJob } from "@/lib/school-record-import-jobs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return (
      authResult.error ??
      NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    );
  }

  const { id } = await context.params;
  const job = getSchoolRecordImportJob(id);
  if (!job) {
    return NextResponse.json({ message: "Import job not found." }, { status: 404 });
  }

  return NextResponse.json({ job }, { status: 200 });
}
