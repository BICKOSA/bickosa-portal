"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  createCommitteeAction,
  updateCommitteeAction,
  updateCommitteeStatusAction,
} from "@/app/actions/committees";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type CommitteeStatus =
  | "draft"
  | "nominations_open"
  | "nominations_closed"
  | "active"
  | "dissolved";

type CommitteeRow = {
  id: string;
  name: string;
  purpose: string;
  status: CommitteeStatus;
  nominationOpens: Date;
  nominationCloses: Date;
  maxMembers: number | null;
  nominationCount: number;
  confirmedCount: number;
  appointedCount: number;
};

const committeeDetailsSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters."),
    purpose: z
      .string()
      .trim()
      .min(10, "Purpose must be at least 10 characters."),
    maxMembers: z.string().trim().optional(),
    nominationOpens: z.string().min(1, "Nomination open date is required."),
    nominationCloses: z.string().min(1, "Nomination close date is required."),
  })
  .refine(
    (value) =>
      new Date(value.nominationCloses) > new Date(value.nominationOpens),
    {
      message: "Nomination close must be after nomination open.",
      path: ["nominationCloses"],
    },
  )
  .refine(
    (value) => {
      if (!value.maxMembers) return true;
      const parsed = Number(value.maxMembers);
      return Number.isInteger(parsed) && parsed > 0;
    },
    {
      message: "Max members must be a positive whole number.",
      path: ["maxMembers"],
    },
  );

const createCommitteeSchema = committeeDetailsSchema.extend({
  status: z.enum(["draft", "nominations_open"]),
});

type CommitteeDetailsValues = z.infer<typeof committeeDetailsSchema>;
type CreateCommitteeValues = z.infer<typeof createCommitteeSchema>;

const statusLabels: Record<CommitteeStatus, string> = {
  draft: "Draft",
  nominations_open: "Nominations Open",
  nominations_closed: "Nominations Closed",
  active: "Active",
  dissolved: "Dissolved",
};

const statusDescriptions: Record<CommitteeStatus, string> = {
  draft: "Hidden from nominations while admins prepare details.",
  nominations_open:
    "Verified alumni can submit nominations during the configured window.",
  nominations_closed:
    "Nominations are locked while admins review responses and appointments.",
  active: "Committee is active and visible as a current body.",
  dissolved: "Committee is closed. This is the final status.",
};

function statusVariant(status: CommitteeStatus) {
  if (status === "nominations_open") return "navy";
  if (status === "active") return "success";
  if (status === "dissolved") return "error";
  return "outline";
}

function getAllowedNextStatuses(status: CommitteeStatus): CommitteeStatus[] {
  if (status === "draft") return ["nominations_open"];
  if (status === "nominations_open") return ["nominations_closed", "dissolved"];
  if (status === "nominations_closed") return ["active", "dissolved"];
  if (status === "active") return ["dissolved"];
  return [];
}

function toDateTimeLocal(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseMaxMembers(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function CommitteesAdminClient(props: { committees: CommitteeRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editingCommittee, setEditingCommittee] =
    React.useState<CommitteeRow | null>(null);
  const [statusCommittee, setStatusCommittee] =
    React.useState<CommitteeRow | null>(null);
  const [selectedNextStatus, setSelectedNextStatus] = React.useState<
    CommitteeStatus | ""
  >("");
  const [busyStatusId, setBusyStatusId] = React.useState<string | null>(null);
  const [isCreateBusy, setIsCreateBusy] = React.useState(false);
  const [isEditBusy, setIsEditBusy] = React.useState(false);

  const createForm = useForm<CreateCommitteeValues>({
    resolver: zodResolver(createCommitteeSchema),
    defaultValues: {
      name: "",
      purpose: "",
      maxMembers: "",
      nominationOpens: "",
      nominationCloses: "",
      status: "draft",
    },
  });

  const editForm = useForm<CommitteeDetailsValues>({
    resolver: zodResolver(committeeDetailsSchema),
    defaultValues: {
      name: "",
      purpose: "",
      maxMembers: "",
      nominationOpens: "",
      nominationCloses: "",
    },
  });

  function openEditDialog(committee: CommitteeRow) {
    setEditingCommittee(committee);
    editForm.reset({
      name: committee.name,
      purpose: committee.purpose,
      maxMembers: committee.maxMembers?.toString() ?? "",
      nominationOpens: toDateTimeLocal(committee.nominationOpens),
      nominationCloses: toDateTimeLocal(committee.nominationCloses),
    });
  }

  function openStatusDialog(committee: CommitteeRow) {
    const nextStatuses = getAllowedNextStatuses(committee.status);
    setStatusCommittee(committee);
    setSelectedNextStatus(nextStatuses[0] ?? "");
  }

  async function onCreate(values: CreateCommitteeValues) {
    setIsCreateBusy(true);
    const result = await createCommitteeAction({
      name: values.name,
      purpose: values.purpose,
      maxMembers: parseMaxMembers(values.maxMembers),
      nominationOpens: values.nominationOpens,
      nominationCloses: values.nominationCloses,
      status: values.status,
    });
    setIsCreateBusy(false);

    if (!result.ok) {
      toast({
        title: "Could not create committee",
        description: result.message,
      });
      return;
    }

    toast({
      title: "Committee created",
      description: result.message,
      variant: "success",
    });
    createForm.reset();
    router.refresh();
  }

  async function onUpdate(values: CommitteeDetailsValues) {
    if (!editingCommittee) return;

    setIsEditBusy(true);
    const result = await updateCommitteeAction({
      committeeId: editingCommittee.id,
      name: values.name,
      purpose: values.purpose,
      maxMembers: parseMaxMembers(values.maxMembers),
      nominationOpens: values.nominationOpens,
      nominationCloses: values.nominationCloses,
    });
    setIsEditBusy(false);

    if (!result.ok) {
      toast({
        title: "Could not update committee",
        description: result.message,
      });
      return;
    }

    toast({
      title: "Committee updated",
      description: result.message,
      variant: "success",
    });
    setEditingCommittee(null);
    router.refresh();
  }

  async function onUpdateStatus() {
    if (!statusCommittee || !selectedNextStatus) return;

    setBusyStatusId(statusCommittee.id);
    const result = await updateCommitteeStatusAction({
      committeeId: statusCommittee.id,
      nextStatus: selectedNextStatus,
    });
    setBusyStatusId(null);

    if (!result.ok) {
      toast({ title: "Could not update status", description: result.message });
      return;
    }

    toast({
      title: "Committee status updated",
      description: result.message,
      variant: "success",
    });
    setStatusCommittee(null);
    setSelectedNextStatus("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="border-border rounded-(--r-lg) border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">
          Create Committee
        </h3>
        <form
          className="mt-3 grid gap-3 md:grid-cols-2"
          onSubmit={createForm.handleSubmit(onCreate)}
        >
          <Input
            label="Name"
            placeholder="Committee name"
            {...createForm.register("name")}
            error={createForm.formState.errors.name?.message}
          />
          <Input
            label="Max members"
            placeholder="Optional"
            inputMode="numeric"
            {...createForm.register("maxMembers")}
            error={createForm.formState.errors.maxMembers?.message}
          />
          <Textarea
            label="Purpose / Mandate"
            className="min-h-28"
            containerClassName="md:col-span-2"
            placeholder="Describe why this committee exists and what it should deliver."
            {...createForm.register("purpose")}
            error={createForm.formState.errors.purpose?.message}
          />
          <Input
            type="datetime-local"
            label="Nomination opens"
            {...createForm.register("nominationOpens")}
            error={createForm.formState.errors.nominationOpens?.message}
          />
          <Input
            type="datetime-local"
            label="Nomination closes"
            {...createForm.register("nominationCloses")}
            error={createForm.formState.errors.nominationCloses?.message}
          />
          <label className="text-sm font-medium text-(--text-1)">
            Initial status
            <select
              className="mt-1.5 w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)] focus:ring-2 focus:ring-[color:rgba(61,100,176,0.2)]"
              {...createForm.register("status")}
            >
              <option value="draft">Draft</option>
              <option value="nominations_open">
                Open nominations immediately
              </option>
            </select>
          </label>
          <div className="md:col-span-2">
            <Button type="submit" variant="gold" isLoading={isCreateBusy}>
              Create Committee
            </Button>
          </div>
        </form>
      </div>

      <div className="border-border rounded-(--r-lg) border bg-(--white) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-(--text-1)">
              Committee List
            </h3>
            <p className="text-sm text-(--text-3)">
              Edit committee details, review nominations, or move committees
              through their lifecycle.
            </p>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[72rem] text-sm">
            <thead className="bg-(--navy-900) text-(--white)">
              <tr>
                <th className="w-[28%] px-3 py-2 text-left font-medium">
                  Name
                </th>
                <th className="w-44 px-3 py-2 text-left font-medium">Status</th>
                <th className="w-28 px-3 py-2 text-left font-medium">
                  Nominations
                </th>
                <th className="w-36 px-3 py-2 text-left font-medium">
                  Members
                </th>
                <th className="w-52 px-3 py-2 text-left font-medium">Dates</th>
                <th className="w-80 px-3 py-2 text-left font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {props.committees.map((committee) => {
                const nextStatuses = getAllowedNextStatuses(committee.status);
                return (
                  <tr
                    key={committee.id}
                    className="border-border border-b bg-(--white)"
                  >
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium text-(--text-1)">
                        {committee.name}
                      </p>
                      <p className="line-clamp-2 max-w-md text-xs text-(--text-3)">
                        {committee.purpose}
                      </p>
                      <p className="mt-1 text-xs text-(--text-3)">
                        Max members:{" "}
                        {committee.maxMembers?.toLocaleString() ?? "No cap"}
                      </p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Badge
                        variant={statusVariant(committee.status)}
                        className="min-h-6 px-2.5 py-0.5 leading-tight whitespace-nowrap"
                      >
                        {statusLabels[committee.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {committee.nominationCount}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span>
                        {committee.appointedCount.toLocaleString()} appointed
                      </span>
                      <p className="text-xs text-(--text-3)">
                        {committee.confirmedCount.toLocaleString()} confirmed
                        willing
                      </p>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-(--text-3)">
                      <p>Opens: {formatDate(committee.nominationOpens)}</p>
                      <p>Closes: {formatDate(committee.nominationCloses)}</p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/admin/committees/${committee.id}/nominations`}
                          >
                            View Nominations
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(committee)}
                          disabled={committee.status === "dissolved"}
                        >
                          Edit Details
                        </Button>
                        <Button
                          size="sm"
                          variant="navy"
                          onClick={() => openStatusDialog(committee)}
                          disabled={nextStatuses.length === 0}
                        >
                          Change Status
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={Boolean(editingCommittee)}
        onOpenChange={(open) => !open && setEditingCommittee(null)}
      >
        <DialogContent className="w-[min(92vw,44rem)]">
          <DialogHeader>
            <DialogTitle>Edit Committee Details</DialogTitle>
            <DialogDescription>
              Update the committee mandate, nomination window, and member
              target. Nomination records remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={editForm.handleSubmit(onUpdate)}
          >
            <Input
              label="Name"
              {...editForm.register("name")}
              error={editForm.formState.errors.name?.message}
            />
            <Input
              label="Max members"
              inputMode="numeric"
              {...editForm.register("maxMembers")}
              error={editForm.formState.errors.maxMembers?.message}
            />
            <Textarea
              label="Purpose / Mandate"
              className="min-h-32"
              containerClassName="md:col-span-2"
              {...editForm.register("purpose")}
              error={editForm.formState.errors.purpose?.message}
            />
            <Input
              type="datetime-local"
              label="Nomination opens"
              {...editForm.register("nominationOpens")}
              error={editForm.formState.errors.nominationOpens?.message}
            />
            <Input
              type="datetime-local"
              label="Nomination closes"
              {...editForm.register("nominationCloses")}
              error={editForm.formState.errors.nominationCloses?.message}
            />
            <DialogFooter className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCommittee(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="navy" isLoading={isEditBusy}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(statusCommittee)}
        onOpenChange={(open) => !open && setStatusCommittee(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Committee Status</DialogTitle>
            <DialogDescription>
              Choose the next lifecycle state intentionally. Some transitions
              notify members or close nominations.
            </DialogDescription>
          </DialogHeader>
          {statusCommittee ? (
            <div className="space-y-4">
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                <p className="font-medium text-[var(--text-1)]">
                  {statusCommittee.name}
                </p>
                <p className="text-[var(--text-3)]">
                  Current status:{" "}
                  <strong>{statusLabels[statusCommittee.status]}</strong>
                </p>
              </div>
              {getAllowedNextStatuses(statusCommittee.status).length > 0 ? (
                <label className="text-sm font-medium text-[var(--text-1)]">
                  Next status
                  <select
                    value={selectedNextStatus}
                    onChange={(event) =>
                      setSelectedNextStatus(
                        event.target.value as CommitteeStatus,
                      )
                    }
                    className="mt-1.5 w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)] focus:ring-2 focus:ring-[color:rgba(61,100,176,0.2)]"
                  >
                    {getAllowedNextStatuses(statusCommittee.status).map(
                      (status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ) : (
                <p className="text-sm text-[var(--text-3)]">
                  This committee has no remaining status transitions.
                </p>
              )}
              {selectedNextStatus ? (
                <div className="rounded-[var(--r-md)] border border-[var(--navy-100)] bg-[var(--navy-50)] p-3 text-sm text-[var(--navy-900)]">
                  {statusDescriptions[selectedNextStatus]}
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusCommittee(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="navy"
              onClick={() => void onUpdateStatus()}
              isLoading={busyStatusId === statusCommittee?.id}
              disabled={!selectedNextStatus}
            >
              Confirm Status Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
