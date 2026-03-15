import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { alumniProfiles } from "@/lib/db/schema";
import { buildR2PublicUrl, uploadBufferToR2 } from "@/lib/r2";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getR2HealthClientConfig() {
  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  };
}

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const config = getR2HealthClientConfig();
  const missing: string[] = [];

  if (!config.accountId) missing.push("R2_ACCOUNT_ID");
  if (!config.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!config.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!config.bucketName) missing.push("R2_BUCKET_NAME");
  if (!config.publicUrl) missing.push("R2_PUBLIC_URL");

  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "R2 configuration is incomplete.",
        missing,
      },
      { status: 500 },
    );
  }

  try {
    const accountId = config.accountId;
    const accessKeyId = config.accessKeyId;
    const secretAccessKey = config.secretAccessKey;
    const bucketName = config.bucketName;
    const publicUrl = config.publicUrl;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
      return NextResponse.json(
        { ok: false, message: "R2 configuration is incomplete." },
        { status: 500 },
      );
    }

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await client.send(
      new HeadBucketCommand({
        Bucket: bucketName,
      }),
    );

    return NextResponse.json({
      ok: true,
      message: "R2 configuration is valid and bucket is reachable.",
      bucket: bucketName,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "R2 credentials or bucket access check failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "BICKOSA", lastName: "Member" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Member" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function extensionFromContentType(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "bin";
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Avatar file is required." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Only JPG, PNG, and WEBP images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ message: "Image must be 5MB or less." }, { status: 400 });
    }

    const extension = extensionFromContentType(file.type);
    const key = `avatars/${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const uploaded = await uploadBufferToR2({
      key,
      body: buffer,
      contentType: file.type,
    });

    const now = new Date();
    const profile = await db.query.alumniProfiles.findFirst({
      where: eq(alumniProfiles.userId, session.user.id),
    });

    if (!profile) {
      const nameParts = splitName(session.user.name ?? "BICKOSA Member");
      await db.insert(alumniProfiles).values({
        userId: session.user.id,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        avatarKey: uploaded.key,
        updatedAt: now,
      });
    } else {
      await db
        .update(alumniProfiles)
        .set({
          avatarKey: uploaded.key,
          updatedAt: now,
        })
        .where(eq(alumniProfiles.userId, session.user.id));
    }

    return NextResponse.json({
      avatarKey: uploaded.key,
      avatarUrl: uploaded.url ?? buildR2PublicUrl(uploaded.key),
    });
  } catch {
    return NextResponse.json({ message: "Failed to upload avatar." }, { status: 500 });
  }
}
