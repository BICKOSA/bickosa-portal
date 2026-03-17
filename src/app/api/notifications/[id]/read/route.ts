import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const updatedRows = await db
    .update(notifications)
    .set({
      isRead: true,
    })
    .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)))
    .returning({ id: notifications.id });

  if (updatedRows.length === 0) {
    return NextResponse.json({ message: "Notification not found." }, { status: 404 });
  }

  return NextResponse.json({ id }, { status: 200 });
}
