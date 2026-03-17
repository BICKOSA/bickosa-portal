import { createElement } from "react";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { deletionRequests } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/resend";

const PRIVACY_CONTACT_EMAIL = process.env.PRIVACY_CONTACT_EMAIL ?? "data@bickosa.org";
const PRIVACY_ADMIN_EMAIL = process.env.PRIVACY_ADMIN_EMAIL ?? PRIVACY_CONTACT_EMAIL;

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const existingPending = await db.query.deletionRequests.findFirst({
    where: and(
      eq(deletionRequests.userId, session.user.id),
      eq(deletionRequests.status, "pending"),
    ),
    columns: { id: true },
  });

  if (existingPending) {
    return NextResponse.json(
      { message: "A deletion request is already pending for this account." },
      { status: 409 },
    );
  }

  const now = new Date();
  const [created] = await db
    .insert(deletionRequests)
    .values({
      userId: session.user.id,
      requestedAt: now,
      status: "pending",
    })
    .returning({ id: deletionRequests.id });

  await Promise.allSettled([
    sendEmail({
      to: PRIVACY_ADMIN_EMAIL,
      subject: "New account deletion request received",
      react: createElement(
        "div",
        null,
        createElement("p", null, "A new deletion request was submitted."),
        createElement("p", null, `User ID: ${session.user.id}`),
        createElement("p", null, `Email: ${session.user.email ?? "Unknown"}`),
        createElement("p", null, `Requested at: ${now.toISOString()}`),
      ),
      text: `A new deletion request was submitted.\nUser ID: ${session.user.id}\nEmail: ${session.user.email ?? "Unknown"}\nRequested at: ${now.toISOString()}`,
    }),
    session.user.email
      ? sendEmail({
          to: session.user.email,
          subject: "We received your account deletion request",
          react: createElement(
            "div",
            null,
            createElement("p", null, "We received your deletion request."),
            createElement("p", null, "We will process it within 30 days."),
            createElement(
              "p",
              null,
              `If you have questions, contact ${PRIVACY_CONTACT_EMAIL}.`,
            ),
          ),
          text: `We received your deletion request. We will process it within 30 days.\nIf you have questions, contact ${PRIVACY_CONTACT_EMAIL}.`,
        })
      : Promise.resolve({ id: "skipped" }),
  ]);

  return NextResponse.json({ id: created?.id ?? null, status: "pending" }, { status: 201 });
}
