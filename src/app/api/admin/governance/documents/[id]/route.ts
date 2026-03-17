import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  isPublic: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const payload = patchSchema.parse(await request.json());
    const { id } = await context.params;

    await db
      .update(documents)
      .set({
        isPublic: payload.isPublic,
        publishedAt: payload.isPublic ? new Date() : null,
      })
      .where(eq(documents.id, id));

    return NextResponse.json({ id, isPublic: payload.isPublic });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update document visibility.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
