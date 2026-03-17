import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  importSchoolRecordsFromCsv,
  previewSchoolRecordsCsv,
} from "@/lib/alumni-growth";

const schema = z.object({
  csvText: z.string().min(1, "CSV content is required."),
  sourceFile: z.string().trim().min(1, "Filename is required."),
  previewOnly: z.boolean().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return (
      authResult.error ??
      NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    );
  }

  try {
    const payload = schema.parse(await request.json().catch(() => ({})));
    if (payload.previewOnly) {
      return NextResponse.json(previewSchoolRecordsCsv(payload.csvText), {
        status: 200,
      });
    }

    const result = await importSchoolRecordsFromCsv({
      csvText: payload.csvText,
      sourceFile: payload.sourceFile,
      uploadedBy: authResult.session.user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Import failed." },
      { status: 400 },
    );
  }
}
