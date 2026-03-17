"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, GripVertical, MinusCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { submitPollVote } from "@/app/actions/voting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type PollType = "yes_no_abstain" | "multiple_choice" | "ranked_choice";

type PollVoteClientProps = {
  pollId: string;
  pollType: PollType;
  options: string[];
  existingChoice: unknown;
  resultsPublished: boolean;
  results: Array<{ choice: string; count: number; percentage: number }>;
};

const submitSchema = z.object({
  yesNoChoice: z.enum(["yes", "no", "abstain"]).optional(),
});

function SortableRow({
  id,
  label,
  index,
}: {
  id: string;
  label: string;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--navy-50)] text-xs font-semibold text-[var(--navy-700)]">
          {index + 1}
        </span>
        <span className="text-sm text-[var(--text-1)]">{label}</span>
      </div>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-3)] hover:bg-[var(--surface)]"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
    </li>
  );
}

export function PollVoteClient({
  pollId,
  pollType,
  options,
  existingChoice,
  resultsPublished,
  results,
}: PollVoteClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(Boolean(existingChoice));

  const form = useForm<z.infer<typeof submitSchema>>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      yesNoChoice:
        typeof existingChoice === "string" &&
        (existingChoice === "yes" || existingChoice === "no" || existingChoice === "abstain")
          ? existingChoice
          : undefined,
    },
  });

  const [selectedMultiple, setSelectedMultiple] = React.useState<string[]>(
    Array.isArray(existingChoice) ? (existingChoice.filter((value): value is string => typeof value === "string") ?? []) : [],
  );
  const [rankedOptions, setRankedOptions] = React.useState<string[]>(
    Array.isArray(existingChoice)
      ? (existingChoice.filter((value): value is string => typeof value === "string") ?? options)
      : options,
  );
  const [customOptionInput, setCustomOptionInput] = React.useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleToggleMultiple(option: string) {
    setSelectedMultiple((previous) =>
      previous.includes(option) ? previous.filter((value) => value !== option) : [...previous, option],
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRankedOptions((previous) => {
      const oldIndex = previous.findIndex((value) => value === active.id);
      const newIndex = previous.findIndex((value) => value === over.id);
      return arrayMove(previous, oldIndex, newIndex);
    });
  }

  function handleAddCustomRankedOption() {
    const value = customOptionInput.trim();
    if (!value || rankedOptions.includes(value)) return;
    setRankedOptions((previous) => [...previous, value]);
    setCustomOptionInput("");
  }

  async function onSubmit() {
    let choice: string | string[];
    if (pollType === "yes_no_abstain") {
      const yesNoChoice = form.getValues("yesNoChoice");
      if (!yesNoChoice) {
        toast({ title: "Choose an option", description: "Please select Yes, No, or Abstain." });
        return;
      }
      choice = yesNoChoice;
    } else if (pollType === "multiple_choice") {
      if (selectedMultiple.length === 0) {
        toast({ title: "Choose at least one option", description: "Select one or more choices." });
        return;
      }
      choice = selectedMultiple;
    } else {
      if (rankedOptions.length === 0) {
        toast({ title: "No ranking provided", description: "Add and order at least one option." });
        return;
      }
      choice = rankedOptions;
    }

    setSubmitting(true);
    const result = await submitPollVote(pollId, choice);
    setSubmitting(false);
    if (!result.ok) {
      toast({ title: "Poll vote failed", description: result.message });
      return;
    }
    toast({ title: "Vote submitted", description: result.message, variant: "success" });
    setSubmitted(true);
    router.refresh();
  }

  if (submitted) {
    return (
      <div className="space-y-4 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-5">
        <div className="rounded-[var(--r-md)] border border-[var(--navy-100)] bg-[var(--navy-50)] px-4 py-4 text-center">
          <CheckCircle2 className="mx-auto size-7 text-[var(--navy-700)]" />
          <p className="mt-2 text-sm font-medium text-[var(--navy-900)]">
            {resultsPublished
              ? "Your vote has been recorded. Live results are available below."
              : "Thank you — results will be published after the voting window closes."}
          </p>
        </div>
        {resultsPublished ? (
          <div className="space-y-3">
            {results.map((item) => (
              <div key={item.choice} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-1)]">{item.choice}</span>
                  <span className="text-[var(--text-3)]">
                    {item.count} votes ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 rounded-[var(--r-full)] bg-[var(--navy-100)]">
                  <div
                    className="h-full rounded-[var(--r-full)] bg-[var(--navy-700)]"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-5">
      {pollType === "yes_no_abstain" ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { value: "yes", label: "Yes", icon: ThumbsUp },
            { value: "no", label: "No", icon: ThumbsDown },
            { value: "abstain", label: "Abstain", icon: MinusCircle },
          ].map((option) => {
            const selected = form.watch("yesNoChoice") === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => form.setValue("yesNoChoice", option.value as "yes" | "no" | "abstain")}
                className={`rounded-[var(--r-lg)] border p-4 text-left ${
                  selected ? "border-[var(--navy-700)] bg-[var(--navy-50)]" : "border-[var(--border)]"
                }`}
              >
                <Icon className="size-5 text-[var(--navy-700)]" />
                <p className="mt-2 text-base font-semibold text-[var(--text-1)]">{option.label}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {pollType === "multiple_choice" ? (
        <div className="space-y-2">
          {options.map((option) => {
            const selected = selectedMultiple.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleToggleMultiple(option)}
                className={`w-full rounded-[var(--r-md)] border p-3 text-left ${
                  selected ? "border-[var(--navy-700)] bg-[var(--navy-50)]" : "border-[var(--border)]"
                }`}
              >
                <p className="text-sm text-[var(--text-1)]">{option}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {pollType === "ranked_choice" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={customOptionInput}
              onChange={(event) => setCustomOptionInput(event.target.value)}
              placeholder="Add option for ranking"
            />
            <Button variant="outline" onClick={handleAddCustomRankedOption}>
              Add
            </Button>
          </div>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={rankedOptions} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {rankedOptions.map((option, index) => (
                  <SortableRow key={option} id={option} label={option} index={index} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      ) : null}

      <div>
        <Button variant="gold" onClick={() => void onSubmit()} isLoading={isSubmitting}>
          Submit Vote
        </Button>
      </div>
    </div>
  );
}
