import sharp from "sharp";
import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { generateUploadKey, uploadToR2 } from "@/lib/storage/upload";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const bannerTypeSchema = z.enum(["event", "campaign"]);

function getBannerFolder(type: z.infer<typeof bannerTypeSchema>): "event-banners" | "campaign-banners" {
  return type === "event" ? "event-banners" : "campaign-banners";
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawType = formData.get("type");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "File is required." }, { status: 400 });
    }

    if (typeof rawType !== "string") {
      return NextResponse.json({ message: "Banner type is required." }, { status: 400 });
    }

    const type = bannerTypeSchema.parse(rawType);

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Only JPG, PNG, and WEBP images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ message: "Image must be 10MB or less." }, { status: 400 });
    }

    const folder = getBannerFolder(type);
    const key = generateUploadKey(folder, `${file.name.replace(/\.[^/.]+$/, "") || "banner"}.webp`);

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await sharp(inputBuffer)
      .resize(1200, 630, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 86 })
      .toBuffer();

    const url = await uploadToR2(key, outputBuffer, "image/webp");

    return NextResponse.json({ key, url }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid banner type." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to upload banner.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
