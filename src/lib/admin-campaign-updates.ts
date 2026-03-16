import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { campaignUpdates, campaigns, users } from "@/lib/db/schema";

export const campaignUpdateInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(10_000),
});

export type CampaignUpdateInput = z.infer<typeof campaignUpdateInputSchema>;

export async function ensureCampaignExists(campaignId: string) {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
    columns: { id: true },
  });
  return Boolean(campaign);
}

export async function listCampaignUpdatesByCampaignId(campaignId: string) {
  return db
    .select({
      id: campaignUpdates.id,
      campaignId: campaignUpdates.campaignId,
      title: campaignUpdates.title,
      body: campaignUpdates.body,
      createdAt: campaignUpdates.createdAt,
      updatedAt: campaignUpdates.updatedAt,
      authorId: campaignUpdates.authorId,
      authorName: users.name,
    })
    .from(campaignUpdates)
    .leftJoin(users, eq(users.id, campaignUpdates.authorId))
    .where(eq(campaignUpdates.campaignId, campaignId))
    .orderBy(desc(campaignUpdates.createdAt));
}

export async function createCampaignUpdate(params: {
  campaignId: string;
  authorId: string;
  input: CampaignUpdateInput;
}) {
  const [created] = await db
    .insert(campaignUpdates)
    .values({
      campaignId: params.campaignId,
      authorId: params.authorId,
      title: params.input.title,
      body: params.input.body,
    })
    .returning({
      id: campaignUpdates.id,
    });

  return created;
}

export async function updateCampaignUpdate(params: {
  campaignId: string;
  updateId: string;
  input: CampaignUpdateInput;
}) {
  const [updated] = await db
    .update(campaignUpdates)
    .set({
      title: params.input.title,
      body: params.input.body,
      updatedAt: new Date(),
    })
    .where(and(eq(campaignUpdates.id, params.updateId), eq(campaignUpdates.campaignId, params.campaignId)))
    .returning({
      id: campaignUpdates.id,
    });

  return updated ?? null;
}

export async function deleteCampaignUpdate(params: { campaignId: string; updateId: string }) {
  const deleted = await db
    .delete(campaignUpdates)
    .where(and(eq(campaignUpdates.id, params.updateId), eq(campaignUpdates.campaignId, params.campaignId)))
    .returning({
      id: campaignUpdates.id,
    });

  return deleted.length > 0;
}
