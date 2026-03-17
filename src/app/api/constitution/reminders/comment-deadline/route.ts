import { NextResponse } from "next/server";
import { z } from "zod";

import { sendCommentDeadlineReminderNow } from "@/app/actions/constitution";

const bodySchema = z.object({
  proposalId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requiredSecret = process.env.CONSTITUTION_REMINDER_SECRET;
  if (!requiredSecret) {
    return NextResponse.json({ message: "Reminder secret is not configured." }, { status: 500 });
  }

  const headerSecret = request.headers.get("x-reminder-secret");
  if (headerSecret !== requiredSecret) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  const result = await sendCommentDeadlineReminderNow(parsed.data.proposalId);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json({ message: result.message });
}
