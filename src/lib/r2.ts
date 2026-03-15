import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;
const r2PublicUrl = process.env.R2_PUBLIC_URL;

function assertR2Env(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
} {
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
    throw new Error(
      "R2 env vars are required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.",
    );
  }

  return {
    accountId: r2AccountId,
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
    bucketName: r2BucketName,
  };
}

function getR2Client(): S3Client {
  const env = assertR2Env();
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
}

export function getR2BucketName(): string {
  return assertR2Env().bucketName;
}

export function buildR2PublicUrl(key: string): string | null {
  if (!r2PublicUrl) {
    return null;
  }

  const base = r2PublicUrl.replace(/\/$/, "");
  const bucket = getR2BucketName();

  if (base.endsWith(`/${bucket}`)) {
    return `${base}/${key}`;
  }

  return `${base}/${bucket}/${key}`;
}

export async function uploadBufferToR2(params: {
  key: string;
  body: Uint8Array;
  contentType: string;
}) {
  const client = getR2Client();
  const bucket = getR2BucketName();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );

  return {
    key: params.key,
    bucket,
    url: buildR2PublicUrl(params.key),
  };
}
