import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { documentDownloadLogs, documents } from "@/lib/db/schema";
import { getR2SignedDownloadUrl } from "@/lib/r2";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function inferFileExtension(mimeType: string): string {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "application/msword") return "doc";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx";
  }
  return "bin";
}

function buildFilename(title: string, extension: string): string {
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalized || "governance-document"}.${extension}`;
}

export async function GET(request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = (session.user as { role?: string }).role === "admin";
  const { id } = await context.params;
  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      fileKey: documents.fileKey,
      mimeType: documents.mimeType,
      isPublic: documents.isPublic,
    })
    .from(documents)
    .where(isAdmin ? eq(documents.id, id) : and(eq(documents.id, id), eq(documents.isPublic, true)))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ message: "Document not found." }, { status: 404 });
  }

  const extension = inferFileExtension(doc.mimeType);
  const filename = buildFilename(doc.title, extension);
  const signedUrl = await getR2SignedDownloadUrl({
    key: doc.fileKey,
    expiresInSeconds: 60,
    downloadFilename: filename,
  });

  await db.insert(documentDownloadLogs).values({
    documentId: doc.id,
    downloadedByUserId: session.user.id,
    downloadedAt: new Date(),
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.redirect(signedUrl, 302);
}
