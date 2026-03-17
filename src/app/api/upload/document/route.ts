import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { uploadToR2 } from "@/lib/storage/upload";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

const documentSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  category: z.enum([
    "constitution",
    "annual_report",
    "financial",
    "minutes",
    "policy",
    "other",
  ]),
  year: z.coerce.number().int().min(1990).max(2100),
});

function sanitizeFilename(filename: string): string {
  const base = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "document.pdf";
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
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

    const input = documentSchema.parse({
      title: formData.get("title"),
      category: formData.get("category"),
      year: formData.get("year"),
    });

    const sanitizedFilename = sanitizeFilename(file.name.endsWith(".pdf") ? file.name : `${file.name}.pdf`);
    const key = `documents/${input.year}/${crypto.randomUUID()}-${sanitizedFilename}`;
    const body = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(key, body, PDF_MIME_TYPE);

    const [created] = await db
      .insert(documents)
      .values({
        title: input.title,
        category: input.category,
        year: input.year,
        fileKey: key,
        fileSize: file.size,
        mimeType: PDF_MIME_TYPE,
        uploadedById: authResult.session.user.id,
      })
      .returning({
        id: documents.id,
      });

    return NextResponse.json({ id: created.id, key, url }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to upload document.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
