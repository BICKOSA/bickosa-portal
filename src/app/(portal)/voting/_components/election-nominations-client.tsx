"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Search, UserPlus2, UserRoundPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  acceptNomination,
  submitPeerNomination,
  submitSelfNomination,
  withdrawNomination,
} from "@/app/actions/voting";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type PositionItem = {
  id: string;
  title: string;
  description: string | null;
};

type NominationCard = {
  nominationId: string;
  nomineeId: string;
  nomineeName: string;
  avatarUrl: string | null;
  yearOfCompletion: number | null;
  manifesto: string | null;
};

type ViewerNomination = {
  id: string;
  positionId: string;
  nomineeId: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  manifesto: string | null;
};

type AlumniCandidate = {
  id: string;
  fullName: string;
  yearOfCompletion: number | null;
};

const selfNominationSchema = z.object({
  manifesto: z.string().trim().min(100, "Manifesto must be at least 100 characters.").max(1000),
  confirmsEligibility: z.boolean().refine((value) => value, "You must confirm eligibility."),
});

const peerNominationSchema = z.object({
  nomineeId: z.string().uuid("Please select a nominee."),
  note: z.string().trim().max(500).optional(),
});

const acceptSchema = z.object({
  manifesto: z.string().trim().min(100, "Manifesto must be at least 100 characters.").max(1000),
});

type ElectionNominationsClientProps = {
  cycleId: string;
  positions: PositionItem[];
  nominationsByPosition: Record<string, NominationCard[]>;
  viewerNominations: ViewerNomination[];
  alumniCandidates: AlumniCandidate[];
  viewerId: string;
  isVerified: boolean;
};

export function ElectionNominationsClient({
  cycleId,
  positions,
  nominationsByPosition,
  viewerNominations,
  alumniCandidates,
  viewerId,
  isVerified,
}: ElectionNominationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [tab, setTab] = React.useState(positions[0]?.id ?? "");
  const [activePositionId, setActivePositionId] = React.useState(positions[0]?.id ?? "");
  const [search, setSearch] = React.useState("");
  const [selectedPeerNomineeId, setSelectedPeerNomineeId] = React.useState<string | null>(null);
  const [isSelfModalOpen, setSelfModalOpen] = React.useState(false);
  const [isPeerModalOpen, setPeerModalOpen] = React.useState(false);
  const [acceptingNominationId, setAcceptingNominationId] = React.useState<string | null>(null);
  const [isBusy, setBusy] = React.useState(false);

  const selectedPositionId = tab || activePositionId;
  const selectedPosition = positions.find((position) => position.id === selectedPositionId) ?? positions[0];
  const selectedNominations = selectedPosition ? nominationsByPosition[selectedPosition.id] ?? [] : [];

  const selfNominationForPosition = viewerNominations.find(
    (nomination) => nomination.positionId === selectedPosition?.id && nomination.nomineeId === viewerId,
  );
  const hasAlreadyNominated = Boolean(selfNominationForPosition && selfNominationForPosition.status !== "withdrawn");

  const selfForm = useForm<z.infer<typeof selfNominationSchema>>({
    resolver: zodResolver(selfNominationSchema),
    defaultValues: {
      manifesto: selfNominationForPosition?.manifesto ?? "",
      confirmsEligibility: false,
    },
  });

  const peerForm = useForm<z.infer<typeof peerNominationSchema>>({
    resolver: zodResolver(peerNominationSchema),
    defaultValues: {
      nomineeId: "",
      note: "",
    },
  });

  const acceptForm = useForm<z.infer<typeof acceptSchema>>({
    resolver: zodResolver(acceptSchema),
    defaultValues: {
      manifesto: "",
    },
  });

  React.useEffect(() => {
    const nominationId = searchParams.get("nominationId");
    if (nominationId) {
      const pending = viewerNominations.find(
        (item) => item.id === nominationId && item.status === "pending" && item.nomineeId === viewerId,
      );
      if (pending) {
        setAcceptingNominationId(nominationId);
        acceptForm.reset({ manifesto: pending.manifesto ?? "" });
      }
    }
  }, [searchParams, viewerNominations, viewerId, acceptForm]);

  const filteredCandidates = alumniCandidates.filter((candidate) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      candidate.fullName.toLowerCase().includes(term) ||
      String(candidate.yearOfCompletion ?? "").includes(term)
    );
  });

  async function handleSelfNomination(values: z.infer<typeof selfNominationSchema>) {
    if (!selectedPosition) return;
    setBusy(true);
    const result = await submitSelfNomination(selectedPosition.id, values.manifesto);
    setBusy(false);
    if (!result.ok) {
      toast({ title: "Nomination failed", description: result.message });
      return;
    }
    toast({ title: "Nomination submitted", description: result.message, variant: "success" });
    setSelfModalOpen(false);
    router.refresh();
  }

  async function handlePeerNomination(values: z.infer<typeof peerNominationSchema>) {
    if (!selectedPosition) return;
    setBusy(true);
    const result = await submitPeerNomination(selectedPosition.id, values.nomineeId, values.note);
    setBusy(false);
    if (!result.ok) {
      toast({ title: "Peer nomination failed", description: result.message });
      return;
    }
    toast({ title: "Peer nomination submitted", description: result.message, variant: "success" });
    setPeerModalOpen(false);
    setSelectedPeerNomineeId(null);
    setSearch("");
    peerForm.reset();
    router.refresh();
  }

  async function handleAcceptNomination(values: z.infer<typeof acceptSchema>) {
    if (!acceptingNominationId) return;
    setBusy(true);
    const result = await acceptNomination(acceptingNominationId, values.manifesto);
    setBusy(false);
    if (!result.ok) {
      toast({ title: "Could not accept nomination", description: result.message });
      return;
    }
    toast({ title: "Nomination accepted", description: result.message, variant: "success" });
    setAcceptingNominationId(null);
    router.refresh();
  }

  async function handleWithdrawNomination(nominationId: string) {
    setBusy(true);
    const result = await withdrawNomination(nominationId);
    setBusy(false);
    if (!result.ok) {
      toast({ title: "Could not withdraw nomination", description: result.message });
      return;
    }
    toast({ title: "Nomination withdrawn", description: result.message, variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-w-full overflow-x-auto">
          {positions.map((position) => (
            <TabsTrigger key={position.id} value={position.id} onClick={() => setActivePositionId(position.id)}>
              {position.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {positions.map((position) => (
          <TabsContent key={position.id} value={position.id} className="space-y-4">
            <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
              <h3 className="font-[var(--font-ui)] text-base font-semibold text-[var(--text-1)]">
                Approved nominations
              </h3>
              <div className="mt-3 space-y-3">
                {(nominationsByPosition[position.id] ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--text-3)]">No approved nominations yet for this position.</p>
                ) : (
                  (nominationsByPosition[position.id] ?? []).map((nomination) => (
                    <div
                      key={nomination.nominationId}
                      className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={nomination.avatarUrl} name={nomination.nomineeName} size="md" />
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-1)]">{nomination.nomineeName}</p>
                          <p className="text-xs text-[var(--text-3)]">
                            {nomination.yearOfCompletion ? `Class of ${nomination.yearOfCompletion}` : "Alumni"}
                          </p>
                        </div>
                      </div>
                      {nomination.manifesto ? (
                        <p className="mt-2 text-sm text-[var(--text-2)]">{nomination.manifesto.slice(0, 220)}...</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Dialog open={isSelfModalOpen} onOpenChange={setSelfModalOpen}>
                <DialogTrigger
                  render={
                    <Button variant="navy" size="sm" disabled={!isVerified || hasAlreadyNominated}>
                      <UserRoundPlus className="size-4" />
                      Nominate Yourself
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Self-nomination: {position.title}</DialogTitle>
                    <DialogDescription>
                      Submit your manifesto for admin review. Minimum 100 and maximum 1000 characters.
                    </DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={selfForm.handleSubmit(handleSelfNomination)}>
                    <Textarea
                      label="Manifesto"
                      maxLength={1000}
                      {...selfForm.register("manifesto")}
                      helperText={`${selfForm.watch("manifesto")?.length ?? 0}/1000`}
                      error={selfForm.formState.errors.manifesto?.message}
                    />
                    <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                      <Checkbox
                        checked={selfForm.watch("confirmsEligibility")}
                        onCheckedChange={(value) =>
                          selfForm.setValue("confirmsEligibility", value === true, { shouldValidate: true })
                        }
                      />
                      I confirm I meet the eligibility criteria.
                    </label>
                    {selfForm.formState.errors.confirmsEligibility?.message ? (
                      <p className="text-xs text-[var(--error)]">
                        {selfForm.formState.errors.confirmsEligibility.message}
                      </p>
                    ) : null}
                    <DialogFooter>
                      <Button type="submit" variant="navy" isLoading={isBusy}>
                        Submit nomination
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isPeerModalOpen} onOpenChange={setPeerModalOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <UserPlus2 className="size-4" />
                      Nominate Someone Else
                    </Button>
                  }
                />
                <DialogContent className="w-[min(92vw,42rem)]">
                  <DialogHeader>
                    <DialogTitle>Peer nomination: {position.title}</DialogTitle>
                    <DialogDescription>Search verified alumni by name or graduation year.</DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={peerForm.handleSubmit(handlePeerNomination)}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-[var(--text-3)]" />
                      <Input
                        placeholder="Search alumni..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="pl-8"
                      />
                    </div>

                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-[var(--r-md)] border border-[var(--border)] p-2">
                      {filteredCandidates.map((candidate) => {
                        const selected = selectedPeerNomineeId === candidate.id;
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => {
                              setSelectedPeerNomineeId(candidate.id);
                              peerForm.setValue("nomineeId", candidate.id, { shouldValidate: true });
                            }}
                            className={`flex w-full items-center justify-between rounded-[var(--r-md)] border p-2 text-left ${
                              selected
                                ? "border-[var(--navy-700)] bg-[var(--navy-50)]"
                                : "border-[var(--border)] bg-[var(--white)]"
                            }`}
                          >
                            <span className="text-sm text-[var(--text-1)]">{candidate.fullName}</span>
                            <span className="text-xs text-[var(--text-3)]">
                              {candidate.yearOfCompletion ? `Class of ${candidate.yearOfCompletion}` : "Alumni"}
                            </span>
                          </button>
                        );
                      })}
                      {filteredCandidates.length === 0 ? (
                        <p className="px-2 py-4 text-center text-sm text-[var(--text-3)]">
                          No matching alumni found.
                        </p>
                      ) : null}
                    </div>

                    <Textarea
                      label="Optional note to nominee"
                      maxLength={500}
                      {...peerForm.register("note")}
                      helperText={`${peerForm.watch("note")?.length ?? 0}/500`}
                      error={peerForm.formState.errors.note?.message}
                    />
                    {peerForm.formState.errors.nomineeId?.message ? (
                      <p className="text-xs text-[var(--error)]">
                        {peerForm.formState.errors.nomineeId?.message}
                      </p>
                    ) : null}
                    <DialogFooter>
                      <Button type="submit" variant="navy" isLoading={isBusy}>
                        Submit peer nomination
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {viewerNominations.filter((item) => item.status === "pending").length > 0 ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--navy-100)] bg-[var(--navy-50)] p-4">
          <h3 className="font-[var(--font-ui)] text-sm font-semibold text-[var(--navy-900)]">
            Pending nominations requiring action
          </h3>
          <div className="mt-2 space-y-2">
            {viewerNominations
              .filter((item) => item.status === "pending")
              .map((item) => {
                const position = positions.find((entry) => entry.id === item.positionId);
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-1)]">{position?.title ?? "Position"}</p>
                      <p className="text-xs text-[var(--text-3)]">Status: Pending</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAcceptingNominationId(item.id);
                          acceptForm.reset({ manifesto: item.manifesto ?? "" });
                        }}
                      >
                        <CheckCircle2 className="size-4" />
                        Accept & Edit Manifesto
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void handleWithdrawNomination(item.id)}>
                        Withdraw
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(acceptingNominationId)} onOpenChange={(value) => !value && setAcceptingNominationId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept nomination</DialogTitle>
            <DialogDescription>
              Confirm your nomination and update your manifesto for submission.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={acceptForm.handleSubmit(handleAcceptNomination)}>
            <Textarea
              label="Manifesto"
              maxLength={1000}
              {...acceptForm.register("manifesto")}
              helperText={`${acceptForm.watch("manifesto")?.length ?? 0}/1000`}
              error={acceptForm.formState.errors.manifesto?.message}
            />
            <DialogFooter>
              <Button type="submit" variant="navy" isLoading={isBusy}>
                Accept nomination
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
