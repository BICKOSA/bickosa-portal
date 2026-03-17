import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } from "@/lib/storage/r2-client";

const ALLOWED_FOLDERS = [
  "avatars",
  "event-banners",
  "campaign-banners",
  "documents",
  "team-badges",
  "misc",
] as const;

type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim().toLowerCase();
  const sanitized = trimmed
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "file";
}

function normalizeFolder(folder: string): string {
  const normalized = folder.replace(/^\/+|\/+$/g, "").toLowerCase();
  if ((ALLOWED_FOLDERS as readonly string[]).includes(normalized)) {
    return normalized as AllowedFolder;
  }
  return "misc";
}

export function generateUploadKey(folder: string, filename: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const keyFolder = normalizeFolder(folder);
  const safeFilename = sanitizeFilename(filename);
  return `${keyFolder}/${year}/${month}/${crypto.randomUUID()}-${safeFilename}`;
}

export async function uploadToR2(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  );
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  return getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 60): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn },
  );
}
