import { and, eq, sql } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { sendDonationReceiptEmail } from "@/lib/email/resend";
import { trackPortalEvent } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { campaigns, consentLogs, donations, users } from "@/lib/db/schema";
import {
  createNotification,
  createNotificationsForUsers,
  listAllNotificationRecipientUserIds,
} from "@/lib/notifications/create-notification";

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
        donationUserId: null as string | null,
        donationPaymentMethod: null as string | null,
        campaignType: null as string | null,
        campaignMilestone: null as
          | {
              shouldNotify: boolean;
              id: string;
              title: string;
              slug: string;
            }
          | null,
      };
    }

    if (donation.paymentStatus === "completed") {
      const receipt = await getDonationReceiptData(donation.id);
      return {
        status: "already_completed" as const,
        receipt,
        donationUserId: donation.userId,
        donationPaymentMethod: donation.paymentMethod,
        campaignType: null as string | null,
        campaignMilestone: null as
          | {
              shouldNotify: boolean;
              id: string;
              title: string;
              slug: string;
            }
          | null,
      };
    }

    const campaign = await tx.query.campaigns.findFirst({
      where: eq(campaigns.id, donation.campaignId),
      columns: {
        title: true,
        slug: true,
        projectType: true,
        goalAmount: true,
        raisedAmount: true,
        isPublished: true,
      },
    });

    const previousProgressPercent =
      campaign && campaign.goalAmount > BigInt(0)
        ? Number((campaign.raisedAmount * BigInt(100)) / campaign.goalAmount)
        : 0;
    const nextRaisedAmount = (campaign?.raisedAmount ?? BigInt(0)) + donation.amount;
    const nextProgressPercent =
      campaign && campaign.goalAmount > BigInt(0)
        ? Number((nextRaisedAmount * BigInt(100)) / campaign.goalAmount)
        : 0;
    const crossedHalfway =
      Boolean(campaign?.isPublished) &&
      previousProgressPercent < 50 &&
      nextProgressPercent >= 50 &&
      Boolean(campaign?.title) &&
      Boolean(campaign?.slug);

    const [updatedDonation] = await tx
      .update(donations)
      .set({
        paymentStatus: "completed",
        paymentRef: params.paymentRef ?? donation.paymentRef ?? `pay_${crypto.randomUUID()}`,
      })
      .where(and(eq(donations.id, donation.id), eq(donations.paymentStatus, "pending")))
      .returning({
        id: donations.id,
      });

    if (!updatedDonation) {
      const receipt = await getDonationReceiptData(donation.id);
      return {
        status: "already_completed" as const,
        receipt,
        donationUserId: donation.userId,
        donationPaymentMethod: donation.paymentMethod,
        campaignType: campaign?.projectType ?? null,
        campaignMilestone: null as
          | {
              shouldNotify: boolean;
              id: string;
              title: string;
              slug: string;
            }
          | null,
      };
    }

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
      donationUserId: donation.userId,
      donationPaymentMethod: donation.paymentMethod,
      campaignType: campaign?.projectType ?? null,
      campaignMilestone:
        crossedHalfway && campaign
          ? {
              shouldNotify: true,
            id: donation.campaignId,
              title: campaign.title,
              slug: campaign.slug,
            }
          : null,
    };
  });

  if (!completion.receipt) {
    return completion;
  }

  if (completion.status !== "completed") {
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

  if (completion.donationUserId) {
    await createNotification({
      userId: completion.donationUserId,
      type: "donation_received",
      title: "Thank you for your donation",
      body: `Your contribution of ${completion.receipt.amountLabel} to ${completion.receipt.campaignName} was received.`,
      actionUrl: "/donate",
      idempotencyKey: `donation_received:${completion.receipt.donationId}:${completion.donationUserId}`,
    });
  }

  await trackPortalEvent({
    event: "donation_completed",
    userId: completion.donationUserId,
    properties: {
      amount_ugx: Number(completion.receipt.amount),
      campaign_type: completion.campaignType ?? "unknown",
      payment_method: completion.donationPaymentMethod ?? "unknown",
    },
  });

  if (completion.campaignMilestone?.shouldNotify) {
    const recipients = await listAllNotificationRecipientUserIds();
    await createNotificationsForUsers({
      userIds: recipients,
      type: "campaign_milestone",
      title: `${completion.campaignMilestone.title} reached 50% of its goal!`,
      body: "Thanks to our alumni community, this campaign has reached a major milestone.",
      actionUrl: `/donate/${completion.campaignMilestone.slug}`,
      idempotencyKeyPrefix: `campaign_milestone_50:${completion.campaignMilestone.id}`,
    });
  }

  return completion;
}

export async function generateDonationReceiptPdf(receipt: DonationReceiptData): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]); // A4

  const titleFont = await document.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await document.embedFont(StandardFonts.Helvetica);

  let y = 790;
  page.drawText("BICKOSA Alumni Portal", {
    x: 50,
    y,
    size: 12,
    font: bodyFont,
    color: rgb(0.1, 0.18, 0.38),
  });

  y -= 30;
  page.drawText("Donation Receipt", {
    x: 50,
    y,
    size: 24,
    font: titleFont,
    color: rgb(0.05, 0.1, 0.24),
  });

  y -= 28;
  page.drawText(`Reference: ${receipt.referenceNumber}`, {
    x: 50,
    y,
    size: 11,
    font: bodyFont,
    color: rgb(0.25, 0.3, 0.41),
  });

  y -= 50;
  const rows: Array<[string, string]> = [
    ["Donor", receipt.donorName],
    ["Campaign", receipt.campaignName],
    ["Amount", receipt.amountLabel],
    ["Date", receipt.donatedOn],
    ["Donation ID", receipt.donationId],
  ];

  for (const [label, value] of rows) {
    page.drawText(label, {
      x: 50,
      y,
      size: 11,
      font: titleFont,
      color: rgb(0.2, 0.25, 0.34),
    });
    page.drawText(value, {
      x: 170,
      y,
      size: 11,
      font: bodyFont,
      color: rgb(0.12, 0.16, 0.25),
    });
    y -= 24;
  }

  y -= 16;
  page.drawText(
    "Thank you for supporting BICKOSA community initiatives. Keep this receipt for your records.",
    {
      x: 50,
      y,
      size: 10,
      font: bodyFont,
      color: rgb(0.25, 0.3, 0.41),
      maxWidth: 495,
      lineHeight: 14,
    },
  );

  return document.save();
}
