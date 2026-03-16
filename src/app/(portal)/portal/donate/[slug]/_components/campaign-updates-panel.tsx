"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type CampaignUpdate = {
  id: string;
  title: string;
  body: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  authorName: string | null;
};

type CampaignUpdatesPanelProps = {
  campaignId: string;
  canManage: boolean;
  initialUpdates: CampaignUpdate[];
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function CampaignUpdatesPanel({
  campaignId,
  canManage,
  initialUpdates,
}: CampaignUpdatesPanelProps) {
  const { toast } = useToast();
  const [updates, setUpdates] = useState(initialUpdates);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const editingUpdate = useMemo(
    () => updates.find((item) => item.id === editingId) ?? null,
    [editingId, updates],
  );

  async function refreshUpdates() {
    const response = await fetch(`/api/admin/campaigns/${campaignId}/updates`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch updates.");
    }
    const payload = (await response.json()) as { data: CampaignUpdate[] };
    setUpdates(payload.data);
  }

  async function handleCreateOrUpdate() {
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Title and body are required",
      });
      return;
    }

    setIsBusy(true);
    try {
      if (editingId) {
        const response = await fetch(`/api/admin/campaigns/${campaignId}/updates/${editingId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, body }),
        });
        if (!response.ok) {
          throw new Error("Failed to update campaign update.");
        }
        toast({
          title: "Update edited",
          variant: "success",
        });
      } else {
        const response = await fetch(`/api/admin/campaigns/${campaignId}/updates`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, body }),
        });
        if (!response.ok) {
          throw new Error("Failed to create campaign update.");
        }
        toast({
          title: "Update posted",
          variant: "success",
        });
      }

      setTitle("");
      setBody("");
      setEditingId(null);
      await refreshUpdates();
    } catch (error) {
      toast({
        title: "Unable to save update",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(updateId: string) {
    const confirmed = window.confirm("Delete this campaign update?");
    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/updates/${updateId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete campaign update.");
      }
      toast({
        title: "Update deleted",
        variant: "success",
      });
      if (editingId === updateId) {
        setEditingId(null);
        setTitle("");
        setBody("");
      }
      await refreshUpdates();
    } catch (error) {
      toast({
        title: "Unable to delete update",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  function beginEdit(update: CampaignUpdate) {
    setEditingId(update.id);
    setTitle(update.title);
    setBody(update.body);
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <Input label="Update title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea
            className="mt-3"
            label="Update body (Markdown supported)"
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" size="sm" variant="navy" onClick={handleCreateOrUpdate} isLoading={isBusy}>
              {editingId ? "Save Edit" : "Post Update"}
            </Button>
            {editingUpdate ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setTitle("");
                  setBody("");
                }}
              >
                Cancel Edit
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {updates.length === 0 ? (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--border-2)] bg-[var(--surface)] p-3 text-sm text-[var(--text-3)]">
          No updates yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {updates.map((update) => (
            <li
              key={update.id}
              className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-[var(--font-ui)] text-base font-semibold text-[var(--text-1)]">
                    {update.title}
                  </p>
                  <p className="text-xs text-[var(--text-3)]">
                    {DATE_FORMATTER.format(new Date(update.createdAt))}
                    {update.authorName ? ` · ${update.authorName}` : ""}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(update)}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => handleDelete(update.id)}>
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="prose prose-sm mt-2 max-w-none text-[var(--text-2)]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{update.body}</ReactMarkdown>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
