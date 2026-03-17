"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CheckSquare, ChevronRight } from "lucide-react";

import { submitElectionVotes } from "@/app/actions/voting";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type PositionItem = {
  id: string;
  title: string;
};

type CandidateItem = {
  nominationId: string;
  nomineeName: string;
  avatarUrl: string | null;
  yearOfCompletion: number | null;
  manifesto: string | null;
};

type ElectionBallotClientProps = {
  cycleId: string;
  positions: PositionItem[];
  candidatesByPosition: Record<string, CandidateItem[]>;
  existingVotesByPosition: Record<string, string>;
  isVerified: boolean;
};

export function ElectionBallotClient({
  cycleId,
  positions,
  candidatesByPosition,
  existingVotesByPosition,
  isVerified,
}: ElectionBallotClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [showReview, setShowReview] = React.useState(false);
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [showManifestoFor, setShowManifestoFor] = React.useState<string | null>(null);
  const [selectionByPosition, setSelectionByPosition] = React.useState<Record<string, string | null>>(() =>
    positions.reduce<Record<string, string | null>>((acc, position) => {
      acc[position.id] = existingVotesByPosition[position.id] ?? null;
      return acc;
    }, {}),
  );
  const [alreadySubmitted, setAlreadySubmitted] = React.useState(
    positions.length > 0 && positions.every((position) => Boolean(existingVotesByPosition[position.id])),
  );

  const currentPosition = positions[currentStep];
  const progressPercent =
    positions.length > 0 ? Math.round(((Math.min(currentStep + 1, positions.length) / positions.length) * 100)) : 0;

  function handleSelectCandidate(positionId: string, nominationId: string) {
    setSelectionByPosition((previous) => ({
      ...previous,
      [positionId]: nominationId,
    }));
  }

  function handleSkipPosition(positionId: string) {
    const confirmed = window.confirm("Skip this position? You can still review before final submission.");
    if (!confirmed) {
      return;
    }
    setSelectionByPosition((previous) => ({
      ...previous,
      [positionId]: null,
    }));
    handleNext();
  }

  function handleNext() {
    if (currentStep >= positions.length - 1) {
      setShowReview(true);
      return;
    }
    setCurrentStep((step) => step + 1);
  }

  async function handleSubmitBallot() {
    const votes = positions
      .map((position) => ({
        positionId: position.id,
        nomineeId: selectionByPosition[position.id],
      }))
      .filter((vote): vote is { positionId: string; nomineeId: string } => Boolean(vote.nomineeId));

    setSubmitting(true);
    const result = await submitElectionVotes(cycleId, votes);
    setSubmitting(false);

    if (!result.ok) {
      toast({ title: "Could not submit ballot", description: result.message });
      return;
    }

    toast({ title: "Ballot submitted", description: result.message, variant: "success" });
    setAlreadySubmitted(true);
    router.refresh();
  }

  if (!isVerified) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] px-5 py-10 text-center">
        <p className="text-base text-[var(--text-3)]">
          Only verified members can cast ballots in elections.
        </p>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--navy-100)] bg-[var(--navy-50)] px-5 py-10 text-center">
        <CheckCircle2 className="mx-auto size-8 text-[var(--navy-700)]" />
        <h3 className="mt-3 font-[var(--font-ui)] text-lg font-semibold text-[var(--navy-900)]">
          Your ballot has been recorded
        </h3>
        <p className="mt-2 text-sm text-[var(--text-2)]">
          Thank you for participating in this election cycle.
        </p>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="space-y-4 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-5">
        <h3 className="font-[var(--font-ui)] text-lg font-semibold text-[var(--text-1)]">Review selections</h3>
        <ul className="space-y-2">
          {positions.map((position) => {
            const selectedNominationId = selectionByPosition[position.id];
            const selectedCandidate = (candidatesByPosition[position.id] ?? []).find(
              (candidate) => candidate.nominationId === selectedNominationId,
            );
            return (
              <li
                key={position.id}
                className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <span className="text-sm font-medium text-[var(--text-1)]">{position.title}</span>
                <span className="text-sm text-[var(--text-2)]">
                  {selectedCandidate ? selectedCandidate.nomineeName : "Skipped"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowReview(false)}>
            Back
          </Button>
          <Button variant="gold" onClick={() => void handleSubmitBallot()} isLoading={isSubmitting}>
            Confirm & Submit Ballot
          </Button>
        </div>
      </div>
    );
  }

  if (!currentPosition) {
    return null;
  }

  const candidates = candidatesByPosition[currentPosition.id] ?? [];
  const selectedNominationId = selectionByPosition[currentPosition.id];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--text-2)]">
            Step {currentStep + 1} of {positions.length}
          </p>
          <p className="text-xs text-[var(--text-3)]">{progressPercent}% complete</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-[var(--r-full)] bg-[var(--navy-100)]">
          <div
            className="h-full rounded-[var(--r-full)] bg-[var(--navy-700)] transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
        <h3 className="font-[var(--font-ui)] text-lg font-semibold text-[var(--text-1)]">
          {currentPosition.title}
        </h3>
        <div className="mt-3 space-y-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-[var(--text-3)]">No approved candidates for this position.</p>
          ) : (
            candidates.map((candidate) => {
              const selected = selectedNominationId === candidate.nominationId;
              const isExpanded = showManifestoFor === candidate.nominationId;
              return (
                <button
                  key={candidate.nominationId}
                  type="button"
                  onClick={() => handleSelectCandidate(currentPosition.id, candidate.nominationId)}
                  className={`w-full rounded-[var(--r-lg)] border bg-[var(--white)] p-3 text-left ${
                    selected
                      ? "border-[var(--navy-700)] ring-1 ring-[var(--navy-700)]"
                      : "border-[var(--border)] hover:border-[var(--navy-300)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={candidate.avatarUrl} name={candidate.nomineeName} size="md" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-1)]">{candidate.nomineeName}</p>
                        <p className="text-xs text-[var(--text-3)]">
                          {candidate.yearOfCompletion
                            ? `Class of ${candidate.yearOfCompletion}`
                            : "Alumni candidate"}
                        </p>
                      </div>
                    </div>
                    {selected ? <CheckSquare className="size-5 text-[var(--navy-700)]" /> : null}
                  </div>

                  {candidate.manifesto ? (
                    <div className="mt-2">
                      <p className="text-sm text-[var(--text-2)]">
                        {isExpanded ? candidate.manifesto : `${candidate.manifesto.slice(0, 180)}...`}
                      </p>
                      {candidate.manifesto.length > 180 ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setShowManifestoFor(isExpanded ? null : candidate.nominationId);
                          }}
                          className="mt-1 text-xs font-medium text-[var(--navy-700)] underline-offset-2 hover:underline"
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="link" size="sm" onClick={() => handleSkipPosition(currentPosition.id)}>
            Skip this position
          </Button>
          <Button variant="navy" size="sm" onClick={handleNext}>
            Next Position <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
