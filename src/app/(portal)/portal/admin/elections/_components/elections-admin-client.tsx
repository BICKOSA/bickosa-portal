"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { z } from "zod";

import {
  advanceElectionStatusAction,
  bulkApproveNominationsAction,
  createElectionCycleAction,
  reviewNominationAction,
} from "@/app/actions/admin-voting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Cycle = {
  id: string;
  title: string;
  description: string | null;
  nominationOpens: Date;
  nominationCloses: Date;
  votingOpens: Date;
  votingCloses: Date;
  quorumPercent: number;
  status: "draft" | "nominations_open" | "nominations_closed" | "voting_open" | "voting_closed" | "results_published";
};

type Position = {
  id: string;
  title: string;
};

type Nomination = {
  nominationId: string;
  cycleId: string;
  positionId: string;
  nomineeId: string;
  nomineeName: string;
  nominatedById: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  manifesto: string | null;
  createdAt: Date;
  reviewNote: string | null;
  positionTitle: string;
};

type Turnout = {
  eligibleCount: number;
  votedCount: number;
  turnoutPercent: number;
  perPosition: Array<{
    positionId: string;
    positionTitle: string;
    eligibleCount: number;
    votedCount: number;
    remainingCount: number;
  }>;
};

type ResultRow = {
  positionId: string;
  positionTitle: string;
  nomineeName: string;
  voteCount: number;
  percentage: number;
};

const cycleCreateSchema = z
  .object({
    title: z.string().trim().min(3, "Title is required."),
    description: z.string().trim().max(1000).optional(),
    nominationOpens: z.string().min(1),
    nominationCloses: z.string().min(1),
    votingOpens: z.string().min(1),
    votingCloses: z.string().min(1),
    quorumPercent: z.number().int().min(1).max(100),
  })
  .refine((value) => new Date(value.nominationCloses) > new Date(value.nominationOpens), {
    message: "Nomination close must be after nomination open.",
    path: ["nominationCloses"],
  })
  .refine((value) => new Date(value.votingOpens) > new Date(value.nominationCloses), {
    message: "Voting open must be after nomination close.",
    path: ["votingOpens"],
  })
  .refine((value) => new Date(value.votingCloses) > new Date(value.votingOpens), {
    message: "Voting close must be after voting open.",
    path: ["votingCloses"],
  });

function statusBadgeVariant(status: Cycle["status"]): "outline" | "navy" | "gold" | "success" {
  if (status === "nominations_open" || status === "nominations_closed" || status === "voting_closed") {
    return "navy";
  }
  if (status === "voting_open") {
    return "gold";
  }
  if (status === "results_published") {
    return "success";
  }
  return "outline";
}

function statusLabel(status: Cycle["status"]) {
  return status.replaceAll("_", " ");
}

function nextStatus(status: Cycle["status"]): Cycle["status"] | null {
  if (status === "draft") return "nominations_open";
  if (status === "nominations_open") return "nominations_closed";
  if (status === "nominations_closed") return "voting_open";
  if (status === "voting_open") return "voting_closed";
  if (status === "voting_closed") return "results_published";
  return null;
}

export function ElectionsAdminClient(props: {
  adminUserId: string;
  cycles: Cycle[];
  initialCycleId: string | null;
  initialPositions: Position[];
  initialNominations: Nomination[];
  initialTurnout: Turnout | null;
  initialResults: ResultRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = React.useState("cycles");
  const [selectedCycleId, setSelectedCycleId] = React.useState(props.initialCycleId);
  const [isBusy, setBusy] = React.useState(false);
  const [turnout, setTurnout] = React.useState<Turnout | null>(props.initialTurnout);
  const [selectedNominationIds, setSelectedNominationIds] = React.useState<string[]>([]);
  const [showAdvanceDialog, setShowAdvanceDialog] = React.useState(false);
  const [showQuorumOverrideDialog, setShowQuorumOverrideDialog] = React.useState(false);

  const cycleForm = useForm<z.input<typeof cycleCreateSchema>, unknown, z.output<typeof cycleCreateSchema>>({
    resolver: zodResolver(cycleCreateSchema),
    defaultValues: {
      title: "",
      description: "",
      nominationOpens: "",
      nominationCloses: "",
      votingOpens: "",
      votingCloses: "",
      quorumPercent: 25,
    },
  });

  const selectedCycle = props.cycles.find((cycle) => cycle.id === selectedCycleId) ?? props.cycles[0] ?? null;
  const nominationsForSelectedCycle = props.initialNominations.filter(
    (nomination) => nomination.cycleId === selectedCycle?.id,
  );
  const resultsForSelectedCycle = props.initialResults;

  React.useEffect(() => {
    if (!selectedCycle?.id) {
      return;
    }
    if (tab !== "turnout") {
      return;
    }

    async function loadTurnout() {
      const response = await fetch(`/api/admin/elections/${selectedCycle.id}/turnout`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as Turnout;
      setTurnout(data);
    }

    void loadTurnout();
    const interval = window.setInterval(() => {
      void loadTurnout();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [selectedCycle?.id, tab]);

  async function onCreateCycle(values: z.infer<typeof cycleCreateSchema>) {
    setBusy(true);
    const result = await createElectionCycleAction({
      title: values.title,
      description: values.description?.trim() || null,
      nominationOpens: values.nominationOpens,
      nominationCloses: values.nominationCloses,
      votingOpens: values.votingOpens,
      votingCloses: values.votingCloses,
      quorumPercent: values.quorumPercent,
    });
    setBusy(false);
    if (!result.ok) {
      toast({ title: "Could not create election cycle", description: result.message });
      return;
    }
    toast({ title: "Election cycle created", variant: "success" });
    router.push(`/admin/elections/${result.message}/positions`);
  }

  async function onAdvanceStatus(forcePublishDespiteQuorum = false) {
    if (!selectedCycle) return;

    setBusy(true);
    const result = await advanceElectionStatusAction({
      cycleId: selectedCycle.id,
      publishDespiteQuorum: forcePublishDespiteQuorum,
    });
    setBusy(false);
    if (!result.ok) {
      if (result.message.toLowerCase().includes("quorum not met")) {
        setShowQuorumOverrideDialog(true);
        return;
      }
      toast({ title: "Status advance failed", description: result.message });
      return;
    }
    toast({ title: "Status advanced", variant: "success" });
    setShowAdvanceDialog(false);
    setShowQuorumOverrideDialog(false);
    router.refresh();
  }

  async function approveNomination(nominationId: string) {
    const result = await reviewNominationAction({ nominationId, status: "approved" });
    if (!result.ok) {
      toast({ title: "Approval failed", description: result.message });
      return;
    }
    toast({ title: "Nomination approved", variant: "success" });
    router.refresh();
  }

  async function rejectNomination(nominationId: string) {
    const note = window.prompt("Provide optional review note (required for meaningful rejection):") ?? "";
    const result = await reviewNominationAction({
      nominationId,
      status: "rejected",
      reviewNote: note.trim() || null,
    });
    if (!result.ok) {
      toast({ title: "Rejection failed", description: result.message });
      return;
    }
    toast({ title: "Nomination rejected", variant: "success" });
    router.refresh();
  }

  async function bulkApprove() {
    if (selectedNominationIds.length === 0) return;
    const result = await bulkApproveNominationsAction(selectedNominationIds);
    if (!result.ok) {
      toast({ title: "Bulk approve failed", description: result.message });
      return;
    }
    toast({ title: "Selected nominations approved", variant: "success" });
    setSelectedNominationIds([]);
    router.refresh();
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="cycles">Election Cycles</TabsTrigger>
        <TabsTrigger value="nominations">Nominations Review</TabsTrigger>
        <TabsTrigger value="turnout">Voter Turnout</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
      </TabsList>

      <TabsContent value="cycles" className="space-y-4">
        <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
          <h3 className="text-base font-semibold text-(--text-1)">Create New Election</h3>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={cycleForm.handleSubmit(onCreateCycle)}>
            <input
              className="rounded-(--r-md) border border-border px-3 py-2 text-sm"
              placeholder="Title"
              {...cycleForm.register("title")}
            />
            <input
              className="rounded-(--r-md) border border-border px-3 py-2 text-sm"
              type="number"
              placeholder="Quorum %"
              {...cycleForm.register("quorumPercent", { valueAsNumber: true })}
            />
            <Textarea
              className="md:col-span-2"
              placeholder="Description"
              {...cycleForm.register("description")}
            />
            <div className="rounded-(--r-md) border border-border p-3 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--text-3)">Nomination window</p>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-(--text-2)">
                  Opens
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm"
                    {...cycleForm.register("nominationOpens")}
                  />
                </label>
                <label className="text-sm text-(--text-2)">
                  Closes
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm"
                    {...cycleForm.register("nominationCloses")}
                  />
                </label>
              </div>
            </div>
            <div className="rounded-(--r-md) border border-border p-3 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--text-3)">Voting window</p>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-(--text-2)">
                  Opens
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm"
                    {...cycleForm.register("votingOpens")}
                  />
                </label>
                <label className="text-sm text-(--text-2)">
                  Closes
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm"
                    {...cycleForm.register("votingCloses")}
                  />
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" variant="gold" isLoading={isBusy}>
                Create Election
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-(--text-1)">Election Cycles</h3>
            {selectedCycle ? (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/elections/${selectedCycle.id}/positions`}>Manage Positions</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAdvanceDialog(true)} isLoading={isBusy}>
                  Advance Status
                </Button>
              </div>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            {props.cycles.map((cycle) => (
              <button
                key={cycle.id}
                type="button"
                onClick={() => setSelectedCycleId(cycle.id)}
                className={`w-full rounded-(--r-md) border px-3 py-2 text-left ${
                  selectedCycleId === cycle.id
                    ? "border-(--navy-700) bg-(--navy-50)"
                    : "border-border bg-(--white)"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-(--text-1)">{cycle.title}</p>
                  <Badge variant={statusBadgeVariant(cycle.status)}>{statusLabel(cycle.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-(--text-3)">
                  Nomination: {new Date(cycle.nominationOpens).toLocaleDateString()} -{" "}
                  {new Date(cycle.nominationCloses).toLocaleDateString()} · Voting:{" "}
                  {new Date(cycle.votingOpens).toLocaleDateString()} - {new Date(cycle.votingCloses).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="nominations" className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void bulkApprove()} disabled={selectedNominationIds.length === 0}>
            Bulk approve selected
          </Button>
        </div>
        <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
          <div className="space-y-2">
            {nominationsForSelectedCycle.map((nomination) => (
              <div key={nomination.nominationId} className="rounded-(--r-md) border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedNominationIds.includes(nomination.nominationId)}
                      onCheckedChange={(checked) =>
                        setSelectedNominationIds((prev) =>
                          checked === true
                            ? [...new Set([...prev, nomination.nominationId])]
                            : prev.filter((id) => id !== nomination.nominationId),
                        )
                      }
                    />
                    {nomination.nomineeName} · {nomination.positionTitle}
                  </label>
                  <Badge variant={nomination.status === "approved" ? "success" : nomination.status === "rejected" ? "error" : "outline"}>
                    {nomination.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-(--text-3)">
                  Submitted: {new Date(nomination.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-(--text-2)">
                  {nomination.manifesto?.slice(0, 180) ?? "No manifesto submitted yet."}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void approveNomination(nomination.nominationId)}>
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-(--error) hover:text-(--error)"
                    onClick={() => void rejectNomination(nomination.nominationId)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="turnout" className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
            <p className="text-xs uppercase tracking-wide text-(--text-3)">Eligible voters</p>
            <p className="mt-1 text-3xl font-semibold text-(--navy-900)">{turnout?.eligibleCount ?? 0}</p>
          </div>
          <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
            <p className="text-xs uppercase tracking-wide text-(--text-3)">Votes cast</p>
            <p className="mt-1 text-3xl font-semibold text-(--navy-900)">{turnout?.votedCount ?? 0}</p>
          </div>
          <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
            <p className="text-xs uppercase tracking-wide text-(--text-3)">Turnout %</p>
            <p className="mt-1 text-3xl font-semibold text-(--navy-900)">{turnout?.turnoutPercent ?? 0}%</p>
          </div>
        </div>
        <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
          <h3 className="text-base font-semibold text-(--text-1)">Per-position turnout</h3>
          <div className="mt-2 space-y-2">
            {turnout?.perPosition.map((row) => (
              <div key={row.positionId} className="rounded-(--r-md) border border-border px-3 py-2">
                <p className="text-sm font-semibold text-(--text-1)">{row.positionTitle}</p>
                <p className="text-xs text-(--text-3)">
                  Eligible {row.eligibleCount} · Voted {row.votedCount} · Remaining {row.remainingCount}
                </p>
              </div>
            )) ?? <p className="text-sm text-(--text-3)">No turnout data available.</p>}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="results" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {selectedCycle ? (
            <>
              <Button variant="gold" onClick={() => void onAdvanceStatus()} isLoading={isBusy}>
                Publish Results
              </Button>
              <Button asChild variant="outline">
                <a href={`/api/admin/elections/${selectedCycle.id}/results.csv`}>Export CSV</a>
              </Button>
            </>
          ) : null}
        </div>
        <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
          <ChartContainer
            className="mb-4 h-[280px] w-full"
            config={{
              voteCount: {
                label: "Votes",
                color: "var(--navy-700)",
              },
            }}
          >
            <BarChart data={resultsForSelectedCycle.slice(0, 12)}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="nomineeName"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={56}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="voteCount" fill="var(--color-voteCount)" radius={6} />
            </BarChart>
          </ChartContainer>
          <div className="space-y-2">
            {resultsForSelectedCycle.map((row, index) => (
              <div
                key={`${row.positionId}-${row.nomineeName}-${index}`}
                className={`rounded-(--r-md) border px-3 py-2 ${
                  index === 0 || resultsForSelectedCycle[index - 1]?.positionId !== row.positionId
                    ? "border-(--gold-300) bg-(--gold-50)"
                    : "border-border"
                }`}
              >
                <p className="text-sm font-semibold text-(--text-1)">
                  {row.positionTitle} · {row.nomineeName}
                </p>
                <p className="text-xs text-(--text-3)">
                  {row.voteCount} votes ({row.percentage}%)
                </p>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advance election status</DialogTitle>
            <DialogDescription>
              {selectedCycle
                ? `This will move "${selectedCycle.title}" from ${statusLabel(selectedCycle.status)} to ${
                    nextStatus(selectedCycle.status) ? statusLabel(nextStatus(selectedCycle.status) as Cycle["status"]) : "final"
                  }.`
                : "Select an election cycle first."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvanceDialog(false)}>
              Cancel
            </Button>
            <Button variant="navy" onClick={() => void onAdvanceStatus()} isLoading={isBusy} disabled={!selectedCycle}>
              Confirm Transition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuorumOverrideDialog} onOpenChange={setShowQuorumOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quorum not met</DialogTitle>
            <DialogDescription>
              Turnout is below the configured quorum for this cycle. Publishing anyway should only be done with explicit governance approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuorumOverrideDialog(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={() => void onAdvanceStatus(true)} isLoading={isBusy}>
              Publish Despite Quorum
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}