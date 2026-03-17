import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { uploadToR2 } from "@/lib/storage/upload";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

const payloadSchema = z.object({
  fileName: z.string().trim().min(1),
});

function sanitizeFilename(filename: string): string {
  const base = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "constitution.pdf";
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File is required." }, { status: 400 });
  }
  if (file.type !== PDF_MIME_TYPE) {
    return NextResponse.json({ message: "Only PDF files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ message: "File must be 50MB or less." }, { status: 400 });
  }

  const input = payloadSchema.safeParse({ fileName: formData.get("fileName") ?? file.name });
  if (!input.success) {
    return NextResponse.json({ message: "Invalid filename." }, { status: 400 });
  }

  const key = `documents/constitution/${crypto.randomUUID()}-${sanitizeFilename(input.data.fileName)}`;
  const body = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(key, body, PDF_MIME_TYPE);

  return NextResponse.json({ key, url }, { status: 201 });
}
