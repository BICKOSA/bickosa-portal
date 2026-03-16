import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { completeDonationAndSendReceipt } from "@/lib/donations";
import { db } from "@/lib/db";
import { alumniProfiles, campaigns, donations, privacySettings, users } from "@/lib/db/schema";

const createDonationSchema = z.object({
  campaignId: z.string().uuid(),
  amount: z.coerce.number().int().min(5_000),
  paymentMethod: z.enum(["mtn_momo", "airtel_money", "visa", "mastercard", "bank_transfer"]),
  isAnonymous: z.boolean().default(false),
  showOnDonorWall: z.boolean().default(true),
  phoneNumber: z.string().trim().min(7).max(32),
  simulateSuccess: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = createDonationSchema.parse(await request.json());

    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, payload.campaignId), eq(campaigns.isPublished, true)),
      columns: {
        id: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ message: "Campaign not found." }, { status: 404 });
    }

    const profile = await db
      .select({
        firstName: alumniProfiles.firstName,
        lastName: alumniProfiles.lastName,
        email: users.email,
      })
      .from(users)
      .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
      .where(eq(users.id, session.user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    const donorName =
      profile?.firstName && profile?.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : session.user.name ?? "BICKOSA Donor";

    const paymentRef = `don_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const [created] = await db
      .insert(donations)
      .values({
        campaignId: payload.campaignId,
        userId: session.user.id,
        amount: BigInt(payload.amount),
        currency: "UGX",
        paymentMethod: payload.paymentMethod,
        paymentRef,
        paymentStatus: "pending",
        isAnonymous: payload.isAnonymous,
        donorName,
        donorEmail: profile?.email ?? session.user.email ?? null,
      })
      .returning({
        id: donations.id,
      });

    await db
      .insert(privacySettings)
      .values({
        userId: session.user.id,
        showOnDonorWall: payload.showOnDonorWall,
      })
      .onConflictDoUpdate({
        target: privacySettings.userId,
        set: {
          showOnDonorWall: payload.showOnDonorWall,
          updatedAt: new Date(),
        },
      });

    if (payload.simulateSuccess) {
      await completeDonationAndSendReceipt({
        donationId: created.id,
      });
    }

    return NextResponse.json({
      donationId: created.id,
      email: profile?.email ?? session.user.email ?? null,
      status: payload.simulateSuccess ? "completed" : "pending",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Failed to create donation." }, { status: 500 });
  }
}
