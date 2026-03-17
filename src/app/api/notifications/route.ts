import { and, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

const LIST_LIMIT = 20;

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const [items, unreadAggregate] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        actionUrl: notifications.actionUrl,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(LIST_LIMIT),
    db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false))),
  ]);

  return NextResponse.json(
    {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      unreadCount: unreadAggregate[0]?.count ?? 0,
    },
    { status: 200 },
  );
}

export async function PATCH() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const updatedRows = await db
    .update(notifications)
    .set({
      isRead: true,
    })
    .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)))
    .returning({ id: notifications.id });

  return NextResponse.json(
    {
      markedCount: updatedRows.length,
    },
    { status: 200 },
  );
}
