import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } from "@/lib/storage/r2-client";
import { getPresignedDownloadUrl, uploadToR2 } from "@/lib/storage/upload";

export async function getR2SignedDownloadUrl(params: {
  key: string;
  expiresInSeconds?: number;
  downloadFilename?: string;
}): Promise<string> {
  const expiresInSeconds = params.expiresInSeconds ?? 60;

  if (!params.downloadFilename) {
    return getPresignedDownloadUrl(params.key, expiresInSeconds);
  }

  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: params.key,
      ResponseContentDisposition: `attachment; filename="${params.downloadFilename}"`,
    }),
    { expiresIn: expiresInSeconds },
  );
}

export function getR2BucketName(): string {
  return R2_BUCKET_NAME;
}

export function buildR2PublicUrl(key: string): string | null {
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function uploadBufferToR2(params: {
  key: string;
  body: Uint8Array;
  contentType: string;
}) {
  const url = await uploadToR2(params.key, params.body, params.contentType);
  return {
    key: params.key,
    bucket: R2_BUCKET_NAME,
    url,
  };
}
