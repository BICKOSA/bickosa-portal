import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  listAllGovernanceDocumentsForAdmin,
  parseGovernanceUploadForm,
  uploadGovernanceDocumentFile,
} from "@/lib/admin-governance";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

export async function GET() {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const data = await listAllGovernanceDocumentsForAdmin();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const input = parseGovernanceUploadForm(formData);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "A document file is required." }, { status: 400 });
    }

    const upload = await uploadGovernanceDocumentFile({
      file,
      uploaderUserId: authResult.session.user.id,
    });

    const [created] = await db
      .insert(documents)
      .values({
        title: input.title,
        description: input.description,
        category: input.category,
        fileKey: upload.key,
        fileSize: upload.size,
        mimeType: file.type || "application/octet-stream",
        year: input.year,
        uploadedById: authResult.session.user.id,
        isPublic: input.isPublic,
        publishedAt: input.isPublic ? new Date() : null,
      })
      .returning({
        id: documents.id,
      });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload document.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
