import { and, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { alumniProfiles, users } from "@/lib/db/schema";
import { sendMembershipRenewalReminderEmail } from "@/lib/email/resend";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Kampala",
});

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.bickosa.org").replace(/\/$/, "");

  const membersDueForRenewal = await db
    .select({
      userId: users.id,
      email: users.email,
      firstName: alumniProfiles.firstName,
      membershipExpiresAt: alumniProfiles.membershipExpiresAt,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .where(
      and(
        eq(alumniProfiles.verificationStatus, "verified"),
        gte(alumniProfiles.membershipExpiresAt, now),
        lte(alumniProfiles.membershipExpiresAt, inThirtyDays),
      ),
    );

  let sentCount = 0;
  let failedCount = 0;

  for (const member of membersDueForRenewal) {
    if (!member.membershipExpiresAt) {
      continue;
    }

    try {
      await sendMembershipRenewalReminderEmail({
        to: member.email,
        firstName: member.firstName ?? "Member",
        expiryDate: DATE_FORMATTER.format(member.membershipExpiresAt),
        renewalUrl: `${appUrl}/profile`,
      });
      sentCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    totalDue: membersDueForRenewal.length,
    sentCount,
    failedCount,
    windowDays: 30,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
