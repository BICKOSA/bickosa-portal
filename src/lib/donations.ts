import { and, eq, sql } from "drizzle-orm";

import { sendDonationReceiptEmail } from "@/lib/email/resend";
import { db } from "@/lib/db";
import { campaigns, consentLogs, donations, users } from "@/lib/db/schema";

export type DonationReceiptData = {
  donationId: string;
  amount: bigint;
  amountLabel: string;
  campaignName: string;
  donatedOn: string;
  referenceNumber: string;
  donorName: string;
  donorEmail: string | null;
};

function formatUgx(amount: bigint): string {
  return `UGX ${Number(amount).toLocaleString("en-UG")}`;
}

function formatDonationDate(value: Date): string {
  return new Intl.DateTimeFormat("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export async function getDonationReceiptData(donationId: string): Promise<DonationReceiptData | null> {
  const row = await db
    .select({
      donationId: donations.id,
      amount: donations.amount,
      campaignName: campaigns.title,
      donatedOn: donations.createdAt,
      referenceNumber: donations.paymentRef,
      donorName: users.name,
      donorEmail: sql<string | null>`coalesce(${users.email}, ${donations.donorEmail})`,
    })
    .from(donations)
    .innerJoin(campaigns, eq(campaigns.id, donations.campaignId))
    .leftJoin(users, eq(users.id, donations.userId))
    .where(eq(donations.id, donationId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) {
    return null;
  }

  return {
    donationId: row.donationId,
    amount: row.amount,
    amountLabel: formatUgx(row.amount),
    campaignName: row.campaignName,
    donatedOn: formatDonationDate(row.donatedOn),
    referenceNumber: row.referenceNumber ?? row.donationId,
    donorName: row.donorName ?? "BICKOSA Donor",
    donorEmail: row.donorEmail,
  };
}

export async function completeDonationAndSendReceipt(params: {
  donationId: string;
  paymentRef?: string | null;
}) {
  const now = new Date();

  const completion = await db.transaction(async (tx) => {
    const donation = await tx.query.donations.findFirst({
      where: eq(donations.id, params.donationId),
    });

    if (!donation) {
      return {
        status: "not_found" as const,
        receipt: null,
      };
    }

    if (donation.paymentStatus === "completed") {
      const receipt = await getDonationReceiptData(donation.id);
      return {
        status: "already_completed" as const,
        receipt,
      };
    }

    await tx
      .update(donations)
      .set({
        paymentStatus: "completed",
        paymentRef: params.paymentRef ?? donation.paymentRef ?? `pay_${crypto.randomUUID()}`,
      })
      .where(and(eq(donations.id, donation.id), eq(donations.paymentStatus, "pending")));

    await tx
      .update(campaigns)
      .set({
        raisedAmount: sql`${campaigns.raisedAmount} + ${donation.amount}`,
      })
      .where(eq(campaigns.id, donation.campaignId));

    if (donation.userId) {
      await tx.insert(consentLogs).values({
        userId: donation.userId,
        consentType: "data_processing",
        granted: true,
      });
    }

    const receipt = await getDonationReceiptData(donation.id);

    return {
      status: "completed" as const,
      receipt,
    };
  });

  if (!completion.receipt) {
    return completion;
  }

  if (completion.receipt.donorEmail) {
    await sendDonationReceiptEmail({
      to: completion.receipt.donorEmail,
      firstName: completion.receipt.donorName,
      amount: completion.receipt.amountLabel,
      campaignName: completion.receipt.campaignName,
      donatedOn: completion.receipt.donatedOn,
      referenceNumber: completion.receipt.referenceNumber,
    });
  }

  await db
    .update(donations)
    .set({
      receiptSentAt: now,
      receiptRef: completion.receipt.referenceNumber,
    })
    .where(eq(donations.id, completion.receipt.donationId));

  return completion;
}
