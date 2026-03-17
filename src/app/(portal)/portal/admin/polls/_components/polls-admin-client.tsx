"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { z } from "zod";

import {
  createPollAction,
  setPollStatusAction,
  togglePollPublishAction,
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type PollListItem = {
  id: string;
  title: string;
  description: string | null;
  pollType: "yes_no_abstain" | "multiple_choice" | "ranked_choice";
  status: "draft" | "open" | "closed" | "results_published";
  quorumPercent: number;
  resultsPublished: boolean;
  targetAudience: "all_members" | "verified_only" | "chapter";
  chapterId: string | null;
  isAnonymous: boolean;
  participationCount: number;
  quorumMet: boolean;
  participationPercent: number;
};

type ChapterOption = {
  id: string;
  name: string;
};

const pollSchema = z
  .object({
    title: z.string().trim().min(3),
    description: z.string().trim().max(1000).optional(),
    pollType: z.enum(["yes_no_abstain", "multiple_choice", "ranked_choice"]),
    optionsCsv: z.string().trim().optional(),
    votingOpens: z.string().min(1),
    votingCloses: z.string().min(1),
    quorumPercent: z.number().int().min(1).max(100),
    targetAudience: z.enum(["all_members", "verified_only", "chapter"]),
    chapterId: z.string().optional(),
    isAnonymous: z.boolean(),
  })
  .refine((value) => new Date(value.votingCloses) > new Date(value.votingOpens), {
    message: "Voting close must be after voting open.",
    path: ["votingCloses"],
  });

function pollStatusBadgeVariant(
  status: PollListItem["status"],
): "outline" | "navy" | "gold" | "success" {
  if (status === "open") return "gold";
  if (status === "results_published") return "success";
  if (status === "closed") return "navy";
  return "outline";
}

export function PollsAdminClient({
  polls,
  chapters,
}: {
  polls: PollListItem[];
  chapters: ChapterOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isBusy, setBusy] = React.useState(false);
  const [selectedPollId, setSelectedPollId] = React.useState<string | null>(polls[0]?.id ?? null);
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);
  const [resultChartData, setResultChartData] = React.useState<Array<{ choice: string; count: number }>>([]);

  const form = useForm<z.input<typeof pollSchema>, unknown, z.output<typeof pollSchema>>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      title: "",
      description: "",
      pollType: "yes_no_abstain",
      optionsCsv: "",
      votingOpens: "",
      votingCloses: "",
      quorumPercent: 10,
      targetAudience: "verified_only",
      chapterId: "",
      isAnonymous: false,
    },
  });

  const selectedPoll = polls.find((poll) => poll.id === selectedPollId) ?? null;
  React.useEffect(() => {
    if (!selectedPollId) {
      setResultChartData([]);
      return;
    }

    async function loadResults() {
      const response = await fetch(`/api/admin/polls/${selectedPollId}/results`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setResultChartData([]);
        return;
      }
      const payload = (await response.json()) as {
        aggregate: Array<{ choice: string; count: number }>;
      };
      setResultChartData(payload.aggregate.map((item) => ({ choice: item.choice, count: item.count })));
    }

    void loadResults();
  }, [selectedPollId]);

  const pollType = form.watch("pollType");
  const targetAudience = form.watch("targetAudience");

  async function onCreate(values: z.infer<typeof pollSchema>) {
    const options =
      values.pollType === "yes_no_abstain"
        ? []
        : (values.optionsCsv ?? "")
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);

    if (values.pollType !== "yes_no_abstain" && options.length === 0) {
      toast({ title: "Options are required", description: "Provide poll options for this poll type." });
      return;
    }

    setBusy(true);
    const result = await createPollAction({
      title: values.title,
      description: values.description?.trim() || null,
      pollType: values.pollType,
      options,
      votingOpens: values.votingOpens,
      votingCloses: values.votingCloses,
      quorumPercent: values.quorumPercent,
      targetAudience: values.targetAudience,
      chapterId: values.targetAudience === "chapter" ? values.chapterId?.trim() || null : null,
      isAnonymous: values.isAnonymous,
    });
    setBusy(false);
    if (!result.ok) {
      toast({ title: "Could not create poll", description: result.message });
      return;
    }
    toast({ title: "Poll created", variant: "success" });
    form.reset();
    router.refresh();
  }

  async function setStatus(status: "draft" | "open" | "closed" | "results_published") {
    if (!selectedPoll) return;
    const result = await setPollStatusAction({ pollId: selectedPoll.id, status });
    if (!result.ok) {
      toast({ title: "Could not update status", description: result.message });
      return;
    }
    toast({ title: "Poll status updated", variant: "success" });
    router.refresh();
  }

  async function togglePublish() {
    if (!selectedPoll) return;
    const result = await togglePollPublishAction(selectedPoll.id, !selectedPoll.resultsPublished);
    if (!result.ok) {
      toast({ title: "Could not update publish setting", description: result.message });
      return;
    }
    toast({ title: selectedPoll.resultsPublished ? "Results hidden" : "Results published", variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">Create Poll</h3>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onCreate)}>
          <Input label="Title" {...form.register("title")} />
          <Input
            label="Quorum %"
            type="number"
            min={1}
            max={100}
            {...form.register("quorumPercent", { valueAsNumber: true })}
          />
          <div className="md:col-span-2">
            <Textarea label="Description" {...form.register("description")} />
          </div>
          <label className="text-sm text-(--text-2)">
            Poll type
            <select className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm" {...form.register("pollType")}>
              <option value="yes_no_abstain">Yes / No / Abstain</option>
              <option value="multiple_choice">Multiple choice</option>
              <option value="ranked_choice">Ranked choice</option>
            </select>
          </label>
          <label className="text-sm text-(--text-2)">
            Target audience
            <select
              className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm"
              {...form.register("targetAudience")}
            >
              <option value="all_members">All members</option>
              <option value="verified_only">Verified only</option>
              <option value="chapter">Specific chapter</option>
            </select>
          </label>
          {targetAudience === "chapter" ? (
            <label className="text-sm text-(--text-2)">
              Chapter
              <select className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm" {...form.register("chapterId")}>
                <option value="">Select chapter</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {pollType !== "yes_no_abstain" ? (
            <Input
              className="md:col-span-2"
              label="Options (comma-separated)"
              placeholder="Option A, Option B, Option C"
              {...form.register("optionsCsv")}
            />
          ) : null}
          <div className="rounded-(--r-md) border border-border p-3 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--text-3)">Voting window</p>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-(--text-2)">
                Opens
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm"
                  {...form.register("votingOpens")}
                />
              </label>
              <label className="text-sm text-(--text-2)">
                Closes
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm"
                  {...form.register("votingCloses")}
                />
              </label>
            </div>
          </div>
          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-(--text-2)">
            <Checkbox
              checked={form.watch("isAnonymous")}
              onCheckedChange={(value) => form.setValue("isAnonymous", value === true)}
            />
            Is anonymous
            <span className="text-xs text-(--text-3)">
              Anonymous polls hide individual vote attribution from exports.
            </span>
          </label>
          <div className="md:col-span-2">
            <Button type="submit" variant="gold" isLoading={isBusy}>
              Create Poll
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">Polls</h3>
        <div className="mt-3 space-y-2">
          {polls.map((poll) => (
            <button
              key={poll.id}
              type="button"
              onClick={() => setSelectedPollId(poll.id)}
              className={`w-full rounded-(--r-md) border px-3 py-2 text-left ${
                selectedPollId === poll.id ? "border-(--navy-700) bg-(--navy-50)" : "border-border bg-(--white)"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-(--text-1)">{poll.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={pollStatusBadgeVariant(poll.status)}>{poll.status.replaceAll("_", " ")}</Badge>
                  <Badge variant="outline">{poll.pollType.replaceAll("_", " ")}</Badge>
                </div>
              </div>
              <p className="mt-1 text-xs text-(--text-3)">
                Participation: {poll.participationCount} · Quorum: {poll.quorumPercent}% (
                {poll.quorumMet ? "Met" : "Not met"})
              </p>
            </button>
          ))}
        </div>
      </div>

      {selectedPoll ? (
        <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
          <h3 className="text-base font-semibold text-(--text-1)">Actions — {selectedPoll.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void setStatus("open")}>
              Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-(--error) hover:text-(--error)"
              onClick={() => setShowCloseConfirm(true)}
            >
              Close Early
            </Button>
            <Button variant="outline" size="sm" onClick={() => void togglePublish()}>
              {selectedPoll.resultsPublished ? "Hide Results" : "Publish Results"}
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/admin/polls/${selectedPoll.id}/export.csv`}>Export CSV</a>
            </Button>
          </div>
          <div className="mt-4 rounded-(--r-md) border border-border bg-(--surface) p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--text-3)">Results preview</p>
            <ChartContainer
              className="mt-2 h-[220px] w-full"
              config={{
                count: {
                  label: "Votes",
                  color: "var(--navy-700)",
                },
              }}
            >
              <BarChart data={resultChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="choice" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={6} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      ) : null}

      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close poll early?</DialogTitle>
            <DialogDescription>
              This is a destructive action and will stop new votes immediately, even if the voting window is still open.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="text-(--error) hover:text-(--error)"
              onClick={() => {
                setShowCloseConfirm(false);
                void setStatus("closed");
              }}
            >
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
