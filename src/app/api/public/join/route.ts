import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { submitPublicRegistration } from "@/lib/alumni-growth";

const joinSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.email("Enter a valid email address."),
  phone: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^\+?[0-9()\-\s]{7,20}$/, "Enter a valid phone number."),
    ])
    .optional(),
  graduationYear: z
    .number()
    .int()
    .min(1999)
    .max(new Date().getFullYear() + 1),
  stream: z.string().trim().max(120).optional(),
  house: z.string().trim().max(120).optional(),
  notableTeachers: z.string().trim().max(500).optional(),
  currentLocation: z.string().trim().max(255).optional(),
  occupation: z.string().trim().max(255).optional(),
  linkedinUrl: z
    .union([z.literal(""), z.url("Enter a valid LinkedIn URL.")])
    .optional(),
  howTheyHeard: z.string().trim().max(255).optional(),
  ref: z.string().trim().max(120).optional(),
});

function getRequestIp(
  forwardedFor: string | null,
  realIp: string | null,
): string | null {
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    if (first?.trim()) {
      return first.trim();
    }
  }
  if (realIp?.trim()) {
    return realIp.trim();
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const payload = joinSchema.parse(await request.json());
    const requestHeaders = await headers();

    await submitPublicRegistration({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      graduationYear: payload.graduationYear,
      stream: payload.stream,
      house: payload.house,
      notableTeachers: payload.notableTeachers,
      currentLocation: payload.currentLocation,
      occupation: payload.occupation,
      linkedinUrl: payload.linkedinUrl,
      howTheyHeard: payload.howTheyHeard,
      referralCode: payload.ref,
      submissionIp: getRequestIp(
        requestHeaders.get("x-forwarded-for"),
        requestHeaders.get("x-real-ip"),
      ),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid registration input." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit registration.",
      },
      { status: 500 },
    );
  }
}
