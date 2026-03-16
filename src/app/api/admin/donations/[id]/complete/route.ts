import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { completeDonationAndSendReceipt } from "@/lib/donations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await context.params;
  const donation = await db.query.donations.findFirst({
    where: eq(donations.id, id),
  });

  if (!donation) {
    return NextResponse.json({ message: "Donation not found." }, { status: 404 });
  }

  if (donation.paymentMethod !== "bank_transfer") {
    return NextResponse.json(
      { message: "Only bank transfer donations can be manually marked completed." },
      { status: 409 },
    );
  }

  if (donation.paymentStatus !== "pending") {
    return NextResponse.json({ message: "Donation is not pending." }, { status: 409 });
  }

  const completion = await completeDonationAndSendReceipt({
    donationId: id,
    paymentRef: donation.paymentRef,
  });

  if (completion.status === "not_found") {
    return NextResponse.json({ message: "Donation not found." }, { status: 404 });
  }

  await db
    .update(donations)
    .set({
      notes: donation.notes
        ? `${donation.notes}\n[ADMIN] Marked completed offline.`
        : "[ADMIN] Marked completed offline.",
    })
    .where(and(eq(donations.id, id), eq(donations.paymentStatus, "completed")));

  return NextResponse.json({
    ok: true,
    status: completion.status,
  });
}
