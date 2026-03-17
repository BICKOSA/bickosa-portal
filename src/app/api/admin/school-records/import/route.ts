import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { createSchoolRecordImportJob } from "@/lib/school-record-import-jobs";
import {
  importSchoolRecordsFromCsv,
  previewSchoolRecordsCsv,
} from "@/lib/alumni-growth";
import { parseSchoolRecordsFile } from "@/lib/school-records-parser";

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
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { message: "Upload a CSV or XLSX file." },
          { status: 400 },
        );
      }

      const sourceFile =
        String(form.get("sourceFile") ?? "").trim() || file.name;
      const previewOnly = String(form.get("previewOnly") ?? "false") === "true";
      const parsed = parseSchoolRecordsFile({
        fileName: file.name,
        bytes: await file.arrayBuffer(),
      });

      if (previewOnly) {
        return NextResponse.json(
          {
            headers: parsed.headers,
            rows: parsed.rows.slice(0, 10),
            validRows: parsed.validRows.length,
            totalRows: parsed.rows.length,
          },
          { status: 200 },
        );
      }

      const job = createSchoolRecordImportJob({
        sourceFile,
        rows: parsed.validRows,
        uploadedBy: authResult.session.user.id,
      });

      return NextResponse.json({ job }, { status: 202 });
    }

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
