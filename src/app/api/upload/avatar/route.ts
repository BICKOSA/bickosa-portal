import sharp from "sharp";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { alumniProfiles } from "@/lib/db/schema";
import { deleteFromR2, uploadToR2 } from "@/lib/storage/upload";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "File is required." }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Only JPG, PNG, and WEBP images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ message: "Image must be 5MB or less." }, { status: 400 });
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const key = `avatars/${year}/${month}/${crypto.randomUUID()}.webp`;

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await sharp(inputBuffer)
      .resize(400, 400, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 86 })
      .toBuffer();

    const url = await uploadToR2(key, outputBuffer, "image/webp");

    const profile = await db.query.alumniProfiles.findFirst({
      where: eq(alumniProfiles.userId, session.user.id),
      columns: {
        id: true,
        avatarKey: true,
      },
    });

    if (profile?.avatarKey) {
      try {
        await deleteFromR2(profile.avatarKey);
      } catch {
        // Ignore cleanup failure and keep new avatar update path successful.
      }
    }

    if (!profile) {
      const { firstName, lastName } = splitName(session.user.name ?? "BICKOSA Member");
      await db.insert(alumniProfiles).values({
        userId: session.user.id,
        firstName,
        lastName,
        avatarKey: key,
        updatedAt: now,
      });
    } else {
      await db
        .update(alumniProfiles)
        .set({
          avatarKey: key,
          updatedAt: now,
        })
        .where(eq(alumniProfiles.userId, session.user.id));
    }

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload avatar.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
