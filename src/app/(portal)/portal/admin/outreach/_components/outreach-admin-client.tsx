"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

type GroupRow = {
  id: string;
  name: string;
  groupType: "cohort" | "regional" | "sports" | "leadership" | "general";
  cohortName: string | null;
  adminName: string | null;
  memberCount: number | null;
  inviteLink: string | null;
  notes: string | null;
  lastOutreachAt: Date | null;
  updatedAt: Date;
};

type CohortOption = {
  id: string;
  name: string | null;
  graduationYear: number;
};

type LinkPerformanceRow = {
  refCode: string;
  registrations: number;
  verified: number;
  conversionRate: number;
};

type Props = {
  groups: GroupRow[];
  linkPerformance: LinkPerformanceRow[];
  cohortOptions: CohortOption[];
  appUrl: string;
};

type GroupDraft = {
  id?: string;
  name: string;
  groupType: GroupRow["groupType"];
  cohortId: string;
  adminName: string;
  adminPhone: string;
  memberCount: string;
  inviteLink: string;
  notes: string;
};

const defaultDraft: GroupDraft = {
  name: "",
  groupType: "general",
  cohortId: "",
  adminName: "",
  adminPhone: "",
  memberCount: "",
  inviteLink: "",
  notes: "",
};

export function OutreachAdminClient({
  groups,
  linkPerformance,
  cohortOptions,
  appUrl,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<GroupDraft>(defaultDraft);
  const [isSaving, setIsSaving] = useState(false);

  const generatedLinks = useMemo(
    () =>
      cohortOptions.map((cohort) => ({
        label: cohort.name ?? `Class of ${cohort.graduationYear}`,
        code: `cohort-${cohort.graduationYear}`,
        url: `${appUrl}/join?ref=${encodeURIComponent(`cohort-${cohort.graduationYear}`)}`,
      })),
    [appUrl, cohortOptions],
  );

  async function saveGroup() {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/outreach/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          name: draft.name,
          groupType: draft.groupType,
          cohortId: draft.cohortId || null,
          adminName: draft.adminName || undefined,
          adminPhone: draft.adminPhone || undefined,
          memberCount: draft.memberCount
            ? Number.parseInt(draft.memberCount, 10)
            : null,
          inviteLink: draft.inviteLink || undefined,
          notes: draft.notes || undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Could not save group.");
      }
      toast({
        title: "WhatsApp group saved",
        variant: "success",
      });
      setDraft(defaultDraft);
      router.refresh();
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function markOutreachSent(groupId: string) {
    try {
      const response = await fetch(
        `/api/admin/outreach/groups/${groupId}/mark-sent`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error("Could not update outreach timestamp.");
      }
      toast({
        title: "Outreach marked as sent",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    }
  }

  function copyOutreachMessage(groupName: string) {
    const message =
      `Hello {group_name}. Join the BICKOSA alumni portal today: {join_link}`.replace(
        "{group_name}",
        groupName,
      );
    navigator.clipboard
      .writeText(message)
      .then(() => {
        toast({
          title: "Message copied",
          variant: "success",
        });
      })
      .catch(() => {
        toast({
          title: "Could not copy message",
        });
      });
  }

  return (
    <Tabs defaultValue="groups">
      <TabsList>
        <TabsTrigger value="groups">WhatsApp Groups</TabsTrigger>
        <TabsTrigger value="performance">
          Registration Link Performance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="groups" className="space-y-4">
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
          <h3 className="text-lg font-[var(--font-ui)] font-semibold text-[var(--navy-900)]">
            Add or edit WhatsApp group
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Group name"
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-3 text-sm"
            />
            <select
              value={draft.groupType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  groupType: event.target.value as GroupRow["groupType"],
                }))
              }
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-3 text-sm"
            >
              <option value="general">General</option>
              <option value="cohort">Cohort</option>
              <option value="regional">Regional</option>
              <option value="sports">Sports</option>
              <option value="leadership">Leadership</option>
            </select>
            <select
              value={draft.cohortId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  cohortId: event.target.value,
                }))
              }
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-3 text-sm"
            >
              <option value="">No cohort</option>
              {cohortOptions.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name ?? `Class of ${cohort.graduationYear}`}
                </option>
              ))}
            </select>
            <input
              value={draft.adminName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  adminName: event.target.value,
                }))
              }
              placeholder="Admin name"
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-3 text-sm"
            />
            <input
              value={draft.adminPhone}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  adminPhone: event.target.value,
                }))
              }
              placeholder="Admin phone"
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-3 text-sm"
            />
            <input
              value={draft.memberCount}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  memberCount: event.target.value,
                }))
              }
              placeholder="Member count"
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-3 text-sm"
            />
            <input
              value={draft.inviteLink}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  inviteLink: event.target.value,
                }))
              }
              placeholder="Invite link"
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-3 text-sm"
            />
          </div>
          <textarea
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
            rows={3}
            placeholder="Notes"
            className="mt-3 w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-3 py-2 text-sm"
          />
          <div className="mt-3">
            <Button
              type="button"
              variant="navy"
              isLoading={isSaving}
              onClick={() => void saveGroup()}
            >
              Save group
            </Button>
          </div>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-3)]">
                <th className="px-2 py-2">Group</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Cohort</th>
                <th className="px-2 py-2">Admin</th>
                <th className="px-2 py-2">Members</th>
                <th className="px-2 py-2">Last outreach</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="border-b border-[var(--border)]">
                  <td className="px-2 py-2">{group.name}</td>
                  <td className="px-2 py-2">{group.groupType}</td>
                  <td className="px-2 py-2">{group.cohortName ?? "-"}</td>
                  <td className="px-2 py-2">{group.adminName ?? "-"}</td>
                  <td className="px-2 py-2">{group.memberCount ?? "-"}</td>
                  <td className="px-2 py-2">
                    {group.lastOutreachAt
                      ? new Date(group.lastOutreachAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="flex flex-wrap gap-2 px-2 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDraft({
                          id: group.id,
                          name: group.name,
                          groupType: group.groupType,
                          cohortId:
                            cohortOptions.find(
                              (option) => option.name === group.cohortName,
                            )?.id ?? "",
                          adminName: group.adminName ?? "",
                          adminPhone: "",
                          memberCount: String(group.memberCount ?? ""),
                          inviteLink: group.inviteLink ?? "",
                          notes: group.notes ?? "",
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      className="border-[#25D366] bg-[#25D366] text-[var(--white)] hover:bg-[#1dbb57]"
                      onClick={() => copyOutreachMessage(group.name)}
                    >
                      Send Outreach
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void markOutreachSent(group.id)}
                    >
                      Mark as sent
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="performance" className="space-y-4">
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
          <h3 className="text-lg font-[var(--font-ui)] font-semibold text-[var(--navy-900)]">
            Ref-code conversion table
          </h3>
          <table className="mt-3 min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-3)]">
                <th className="px-2 py-2">Ref code</th>
                <th className="px-2 py-2">Registrations</th>
                <th className="px-2 py-2">Verified</th>
                <th className="px-2 py-2">Conversion rate</th>
              </tr>
            </thead>
            <tbody>
              {linkPerformance.map((row) => (
                <tr
                  key={row.refCode}
                  className="border-b border-[var(--border)]"
                >
                  <td className="px-2 py-2">{row.refCode}</td>
                  <td className="px-2 py-2">{row.registrations}</td>
                  <td className="px-2 py-2">{row.verified}</td>
                  <td className="px-2 py-2">
                    {row.conversionRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
          <h3 className="text-lg font-[var(--font-ui)] font-semibold text-[var(--navy-900)]">
            Generate new ref links
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-2)]">
            {generatedLinks.map((item) => (
              <li
                key={item.code}
                className="flex flex-wrap items-center gap-2 rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-2"
              >
                <span>{item.label}</span>
                <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-xs">
                  {item.code}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(item.url).then(() => {
                      toast({
                        title: "Shareable URL copied",
                        variant: "success",
                      });
                    });
                  }}
                >
                  Copy shareable URL
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </TabsContent>
    </Tabs>
  );
}
