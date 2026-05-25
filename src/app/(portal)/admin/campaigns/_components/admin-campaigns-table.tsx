"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminCampaignRow } from "@/lib/admin-campaigns";
import { formatUgxCompact } from "@/lib/donate";

type AdminCampaignsTableProps = {
  campaigns: AdminCampaignRow[];
};

function formatProjectType(type: string): string {
  return type
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function AdminCampaignsTable({ campaigns }: AdminCampaignsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleStatus(campaignId: string, values: { isPublished: boolean; isActive: boolean }) {
    setBusyId(campaignId);
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        throw new Error("Failed to update campaign status.");
      }
      toast({
        title: "Campaign status updated",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({
        title: "Could not update campaign",
        description: "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCampaign(campaignId: string) {
    const confirmed = window.confirm(
      "Delete this campaign? This will also remove linked updates and donations.",
    );
    if (!confirmed) {
      return;
    }

    setBusyId(campaignId);
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete campaign.");
      }
      toast({
        title: "Campaign deleted",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({
        title: "Could not delete campaign",
        description: "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <p className="text-sm text-[var(--text-2)]">No campaigns found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Raised / Goal</TableHead>
            <TableHead>%</TableHead>
            <TableHead>Donors</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium text-[var(--text-1)]">{campaign.title}</TableCell>
              <TableCell>{formatProjectType(campaign.projectType)}</TableCell>
              <TableCell>
                {formatUgxCompact(campaign.raisedAmount)} / {formatUgxCompact(campaign.goalAmount)}
              </TableCell>
              <TableCell>{campaign.fundedPercent}%</TableCell>
              <TableCell>{campaign.donorCount.toLocaleString()}</TableCell>
              <TableCell>
                {campaign.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
              </TableCell>
              <TableCell>
                {campaign.isPublished ? <Badge variant="success">Published</Badge> : <Badge variant="outline">Draft</Badge>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/campaigns/${campaign.id}/edit`}>Edit</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/campaigns/${campaign.id}`}>Updates</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isLoading={busyId === campaign.id}
                    onClick={() =>
                      toggleStatus(campaign.id, {
                        isPublished: !campaign.isPublished,
                        isActive: campaign.isActive,
                      })
                    }
                  >
                    {campaign.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isLoading={busyId === campaign.id}
                    onClick={() =>
                      toggleStatus(campaign.id, {
                        isPublished: campaign.isPublished,
                        isActive: !campaign.isActive,
                      })
                    }
                  >
                    {campaign.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[var(--error)] hover:text-[var(--error)]"
                    isLoading={busyId === campaign.id}
                    onClick={() => deleteCampaign(campaign.id)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
