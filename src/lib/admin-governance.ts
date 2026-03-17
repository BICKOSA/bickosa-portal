import { desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { uploadBufferToR2 } from "@/lib/r2";

const governanceCategorySchema = z.union([
  z.literal("constitution"),
  z.literal("annual_report"),
  z.literal("financial"),
  z.literal("minutes"),
  z.literal("policy"),
]);

const uploadDocumentSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().max(240).nullable(),
  category: governanceCategorySchema,
  year: z.number().int().min(1990).max(2100).nullable(),
  isPublic: z.boolean(),
});

export type AdminGovernanceDocument = {
  id: string;
  title: string;
  description: string | null;
  category: "constitution" | "annual_report" | "financial" | "minutes" | "policy";
  fileSize: number;
  year: number | null;
  isPublic: boolean;
  createdAt: Date;
};

function getFormValue(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNullableInt(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(formData: FormData, key: string): boolean {
  const raw = formData.get(key);
  return typeof raw === "string" && (raw === "true" || raw === "1" || raw === "on");
}

export function parseGovernanceUploadForm(formData: FormData) {
  return uploadDocumentSchema.parse({
    title: getFormValue(formData, "title") ?? "",
    description: getFormValue(formData, "description"),
    category: getFormValue(formData, "category"),
    year: parseNullableInt(getFormValue(formData, "year")),
    isPublic: parseBoolean(formData, "isPublic"),
  });
}

export async function uploadGovernanceDocumentFile(params: {
  file: File;
  uploaderUserId: string;
}): Promise<{ key: string; size: number }> {
  const allowedMimeTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

  if (!allowedMimeTypes.has(params.file.type)) {
    throw new Error("Only PDF and Word documents are supported.");
  }

  if (params.file.size > 25 * 1024 * 1024) {
    throw new Error("Document must be 25MB or less.");
  }

  const extension =
    params.file.type === "application/pdf"
      ? "pdf"
      : params.file.type === "application/msword"
        ? "doc"
        : "docx";

  const key = `governance-docs/${params.uploaderUserId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const body = new Uint8Array(await params.file.arrayBuffer());
  const uploaded = await uploadBufferToR2({
    key,
    body,
    contentType: params.file.type,
  });

  return { key: uploaded.key, size: params.file.size };
}

export async function listAllGovernanceDocumentsForAdmin(): Promise<AdminGovernanceDocument[]> {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      description: documents.description,
      category: documents.category,
      fileSize: documents.fileSize,
      year: documents.year,
      isPublic: documents.isPublic,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .orderBy(desc(documents.createdAt));

  return rows.filter((row): row is AdminGovernanceDocument => {
    return (
      row.category === "constitution" ||
      row.category === "annual_report" ||
      row.category === "financial" ||
      row.category === "minutes" ||
      row.category === "policy"
    );
  });
}
