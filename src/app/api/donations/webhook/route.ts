import { z } from "zod";
import { NextResponse } from "next/server";

import { completeDonationAndSendReceipt } from "@/lib/donations";

const webhookPayloadSchema = z.object({
  donationId: z.string().uuid(),
  status: z.enum(["completed", "failed", "refunded"]).default("completed"),
  paymentRef: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const configuredSecret = process.env.DONATIONS_WEBHOOK_SECRET;
  if (configuredSecret) {
    const providedSecret = request.headers.get("x-donations-webhook-secret");
    if (!providedSecret || providedSecret !== configuredSecret) {
      return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
    }
  }

  try {
    const payload = webhookPayloadSchema.parse(await request.json());

    if (payload.status !== "completed") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const completion = await completeDonationAndSendReceipt({
      donationId: payload.donationId,
      paymentRef: payload.paymentRef,
    });

    if (completion.status === "not_found") {
      return NextResponse.json({ message: "Donation not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      status: completion.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid webhook payload.", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Webhook handling failed." }, { status: 500 });
  }
}
