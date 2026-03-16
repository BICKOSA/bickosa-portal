import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { isAdminUserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { generateDonationReceiptPdf, getDonationReceiptData } from "@/lib/donations";
import { sendDonationReceiptEmail } from "@/lib/email/resend";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const donation = await db.query.donations.findFirst({
    where: eq(donations.id, id),
  });

  if (!donation) {
    return NextResponse.json({ message: "Donation not found." }, { status: 404 });
  }

  const isOwner = donation.userId === session.user.id;
  const isAdmin = isAdminUserRole((session.user as { role?: string }).role);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const receipt = await getDonationReceiptData(id);
  if (!receipt) {
    return NextResponse.json({ message: "Receipt data unavailable." }, { status: 404 });
  }

  if (receipt.donorEmail) {
    await sendDonationReceiptEmail({
      to: receipt.donorEmail,
      firstName: receipt.donorName,
      amount: receipt.amountLabel,
      campaignName: receipt.campaignName,
      donatedOn: receipt.donatedOn,
      referenceNumber: receipt.referenceNumber,
    });
  }

  await db
    .update(donations)
    .set({
      receiptSentAt: new Date(),
      receiptRef: receipt.referenceNumber,
    })
    .where(and(eq(donations.id, id), eq(donations.paymentStatus, "completed")));

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "pdf";

  if (format === "json") {
    return NextResponse.json({
      receipt,
      delivered: Boolean(receipt.donorEmail),
      note: "Pass ?format=pdf (or omit format) to download the PDF receipt.",
    });
  }

  const pdfBytes = await generateDonationReceiptPdf(receipt);
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="donation-receipt-${receipt.referenceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
