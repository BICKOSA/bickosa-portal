"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  advanceProposalStatus,
  createAmendmentProposal,
  createConstitutionVersionAction,
  recordAGMOutcome,
  setCurrentConstitutionVersionAction,
} from "@/app/actions/constitution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

type VersionRow = {
  id: string;
  versionTag: string;
  effectiveDate: string;
  documentUrl: string | null;
  isCurrent: boolean;
  notes: string | null;
  createdAt: Date;
};

type ProposalRow = {
  id: string;
  clauseReference: string | null;
  status: "draft" | "open_for_comment" | "under_review" | "petition_raised" | "approved" | "deferred";
  commentClosesAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  rationale: string;
  versionTag: string | null;
  proposedByName: string | null;
  commentCount: number;
};

type PetitionRow = {
  id: string;
  agmEventId: string | null;
  amendmentProposalId: string | null;
  outcome: "approved" | "deferred" | "withdrawn" | null;
  outcomeNotes: string | null;
  votedAt: Date | null;
  createdAt: Date;
  eventTitle: string | null;
  clauseReference: string | null;
  proposalStatus: ProposalRow["status"] | null;
};

type AgmEventOption = {
  id: string;
  title: string;
  startAt: Date;
};

export function ConstitutionAdminClient(props: {
  versions: VersionRow[];
  proposals: ProposalRow[];
  petitions: PetitionRow[];
  agmEvents: AgmEventOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [uploadingPdf, setUploadingPdf] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const [versionTag, setVersionTag] = React.useState("");
  const [effectiveDate, setEffectiveDate] = React.useState("");
  const [documentUrl, setDocumentUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [setCurrent, setSetCurrent] = React.useState(true);

  const [proposalVersionId, setProposalVersionId] = React.useState("");
  const [clauseReference, setClauseReference] = React.useState("");
  const [currentText, setCurrentText] = React.useState("");
  const [proposedText, setProposedText] = React.useState("");
  const [rationale, setRationale] = React.useState("");
  const [commentDeadline, setCommentDeadline] = React.useState("");

  const [petitionEventByProposal, setPetitionEventByProposal] = React.useState<Record<string, string>>({});
  const [petitionOutcome, setPetitionOutcome] = React.useState<Record<string, "approved" | "deferred" | "withdrawn">>({});
  const [petitionNotes, setPetitionNotes] = React.useState<Record<string, string>>({});

  async function uploadConstitutionPdf(file: File) {
    const form = new FormData();
    form.set("file", file);
    form.set("fileName", file.name);
    setUploadingPdf(true);
    const response = await fetch("/api/upload/constitution", {
      method: "POST",
      body: form,
    });
    setUploadingPdf(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast({ title: "Upload failed", description: body?.message ?? "Could not upload PDF." });
      return;
    }
    const payload = (await response.json()) as { url: string };
    setDocumentUrl(payload.url);
    toast({ title: "PDF uploaded", variant: "success" });
  }

  async function onCreateVersion(event: React.FormEvent) {
    event.preventDefault();
    const result = await createConstitutionVersionAction({
      versionTag,
      effectiveDate,
      documentUrl,
      notes,
      setCurrent,
    });
    if (!result.ok) {
      toast({ title: "Could not create version", description: result.message });
      return;
    }
    toast({ title: "Constitution version created", variant: "success" });
    setVersionTag("");
    setEffectiveDate("");
    setDocumentUrl("");
    setNotes("");
    router.refresh();
  }

  async function onSetCurrentVersion(versionId: string) {
    setBusyId(versionId);
    const result = await setCurrentConstitutionVersionAction(versionId);
    setBusyId(null);
    if (!result.ok) {
      toast({ title: "Could not set current version", description: result.message });
      return;
    }
    toast({ title: "Current version updated", variant: "success" });
    router.refresh();
  }

  async function onCreateProposal(event: React.FormEvent) {
    event.preventDefault();
    const result = await createAmendmentProposal({
      constitutionVersionId: proposalVersionId,
      clauseReference,
      currentText,
      proposedText,
      rationale,
      commentClosesAt: commentDeadline ? new Date(commentDeadline).toISOString() : undefined,
    });
    if (!result.ok) {
      toast({ title: "Could not create proposal", description: result.message });
      return;
    }
    toast({ title: "Amendment proposal created", variant: "success" });
    setClauseReference("");
    setCurrentText("");
    setProposedText("");
    setRationale("");
    setCommentDeadline("");
    router.refresh();
  }

  async function onAdvanceStatus(proposal: ProposalRow) {
    const next =
      proposal.status === "draft"
        ? "open_for_comment"
        : proposal.status === "open_for_comment"
          ? "under_review"
          : proposal.status === "under_review"
            ? "petition_raised"
            : null;
    if (!next) return;

    const selectedEventId = petitionEventByProposal[proposal.id];
    setBusyId(proposal.id);
    const result = await advanceProposalStatus(proposal.id, next, selectedEventId);
    setBusyId(null);
    if (!result.ok) {
      toast({ title: "Could not advance status", description: result.message });
      return;
    }
    toast({ title: "Proposal status advanced", variant: "success" });
    router.refresh();
  }

  async function onRecordOutcome(petitionId: string) {
    const outcome = petitionOutcome[petitionId];
    if (!outcome) {
      toast({ title: "Select outcome", description: "Choose Approved, Deferred, or Withdrawn first." });
      return;
    }
    setBusyId(petitionId);
    const result = await recordAGMOutcome(petitionId, outcome, petitionNotes[petitionId]);
    setBusyId(null);
    if (!result.ok) {
      toast({ title: "Could not record outcome", description: result.message });
      return;
    }
    toast({ title: "Outcome recorded", variant: "success" });
    router.refresh();
  }

  return (
    <Tabs defaultValue="versions">
      <TabsList>
        <TabsTrigger value="versions">Constitution Versions</TabsTrigger>
        <TabsTrigger value="proposals">Amendment Proposals</TabsTrigger>
        <TabsTrigger value="petitions">AGM Petitions</TabsTrigger>
      </TabsList>

      <TabsContent value="versions" className="space-y-4">
        <form onSubmit={onCreateVersion} className="grid gap-3 rounded-(--r-lg) border border-border bg-(--white) p-4 md:grid-cols-2">
          <input className="rounded-(--r-md) border border-border px-3 py-2 text-sm" placeholder="Version tag" value={versionTag} onChange={(e) => setVersionTag(e.target.value)} />
          <input className="rounded-(--r-md) border border-border px-3 py-2 text-sm" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          <input className="rounded-(--r-md) border border-border px-3 py-2 text-sm md:col-span-2" placeholder="Document URL (auto-filled by upload)" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} />
          <input
            type="file"
            accept="application/pdf"
            className="rounded-(--r-md) border border-border px-3 py-2 text-sm md:col-span-2"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadConstitutionPdf(file);
            }}
          />
          <textarea className="min-h-24 rounded-(--r-md) border border-border px-3 py-2 text-sm md:col-span-2" placeholder="Notes: what changed from previous version" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-(--text-2)">
            <input type="checkbox" checked={setCurrent} onChange={(e) => setSetCurrent(e.target.checked)} />
            Set as current version
          </label>
          <div className="md:col-span-2">
            <Button type="submit" variant="gold" isLoading={uploadingPdf}>
              Save Constitution Version
            </Button>
          </div>
        </form>

        <div className="space-y-2 rounded-(--r-lg) border border-border bg-(--white) p-4">
          {props.versions.map((version) => (
            <div key={version.id} className="flex items-start justify-between gap-3 rounded-(--r-md) border border-border p-3">
              <div>
                <p className="text-sm font-semibold text-(--text-1)">
                  {version.versionTag} {version.isCurrent ? "· Current" : ""}
                </p>
                <p className="text-xs text-(--text-3)">Effective {version.effectiveDate}</p>
                {version.notes ? <p className="mt-1 text-sm text-(--text-2)">{version.notes}</p> : null}
              </div>
              <div className="flex gap-2">
                {version.documentUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={version.documentUrl} target="_blank" rel="noreferrer">Open PDF</a>
                  </Button>
                ) : null}
                {!version.isCurrent ? (
                  <Button size="sm" variant="outline" isLoading={busyId === version.id} onClick={() => void onSetCurrentVersion(version.id)}>
                    Set as Current
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="proposals" className="space-y-4">
        <form onSubmit={onCreateProposal} className="grid gap-3 rounded-(--r-lg) border border-border bg-(--white) p-4">
          <select className="rounded-(--r-md) border border-border px-3 py-2 text-sm" value={proposalVersionId} onChange={(e) => setProposalVersionId(e.target.value)}>
            <option value="">Select constitution version</option>
            {props.versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.versionTag}
              </option>
            ))}
          </select>
          <input className="rounded-(--r-md) border border-border px-3 py-2 text-sm" placeholder="Clause reference (e.g. Article 7, Section 2)" value={clauseReference} onChange={(e) => setClauseReference(e.target.value)} />
          <textarea className="min-h-20 rounded-(--r-md) border border-border px-3 py-2 text-sm" placeholder="Current text" value={currentText} onChange={(e) => setCurrentText(e.target.value)} />
          <textarea className="min-h-20 rounded-(--r-md) border border-border px-3 py-2 text-sm" placeholder="Proposed text" value={proposedText} onChange={(e) => setProposedText(e.target.value)} />
          <textarea className="min-h-24 rounded-(--r-md) border border-border px-3 py-2 text-sm" placeholder="Rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} />
          <label className="text-sm text-(--text-2)">
            Comment deadline
            <input type="datetime-local" className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm" value={commentDeadline} onChange={(e) => setCommentDeadline(e.target.value)} />
          </label>
          <div>
            <Button type="submit" variant="navy">Create Proposal</Button>
          </div>
        </form>

        <div className="space-y-2 rounded-(--r-lg) border border-border bg-(--white) p-4">
          {props.proposals.map((proposal) => (
            <div key={proposal.id} className="rounded-(--r-md) border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-(--text-1)">{proposal.clauseReference ?? "Clause reference"}</p>
                <Badge variant={proposal.status === "open_for_comment" ? "navy" : proposal.status === "approved" ? "success" : "outline"}>
                  {proposal.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-(--text-3)">
                {proposal.versionTag ?? "No version"} · {proposal.commentCount} comments
              </p>
              {proposal.status === "under_review" ? (
                <select
                  className="mt-2 w-full rounded-(--r-md) border border-border px-2 py-1.5 text-sm"
                  value={petitionEventByProposal[proposal.id] ?? ""}
                  onChange={(e) => setPetitionEventByProposal((prev) => ({ ...prev, [proposal.id]: e.target.value }))}
                >
                  <option value="">Select AGM event for petition</option>
                  {props.agmEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} ({new Date(event.startAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="mt-2">
                {(proposal.status === "draft" || proposal.status === "open_for_comment" || proposal.status === "under_review") ? (
                  <Button size="sm" variant="outline" isLoading={busyId === proposal.id} onClick={() => void onAdvanceStatus(proposal)}>
                    Advance Status
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="petitions" className="space-y-3">
        <div className="space-y-2 rounded-(--r-lg) border border-border bg-(--white) p-4">
          {props.petitions.map((petition) => (
            <div key={petition.id} className="space-y-2 rounded-(--r-md) border border-border p-3">
              <p className="text-sm font-semibold text-(--text-1)">
                {petition.eventTitle ?? "AGM event"} · {petition.clauseReference ?? "Amendment"}
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                <select
                  className="rounded-(--r-md) border border-border px-2 py-1.5 text-sm"
                  value={petitionOutcome[petition.id] ?? petition.outcome ?? ""}
                  onChange={(e) =>
                    setPetitionOutcome((prev) => ({
                      ...prev,
                      [petition.id]: e.target.value as "approved" | "deferred" | "withdrawn",
                    }))
                  }
                >
                  <option value="">Select outcome</option>
                  <option value="approved">Approved</option>
                  <option value="deferred">Deferred</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <input
                  className="rounded-(--r-md) border border-border px-2 py-1.5 text-sm md:col-span-2"
                  placeholder="Outcome notes"
                  value={petitionNotes[petition.id] ?? petition.outcomeNotes ?? ""}
                  onChange={(e) => setPetitionNotes((prev) => ({ ...prev, [petition.id]: e.target.value }))}
                />
              </div>
              <Button size="sm" variant="navy" isLoading={busyId === petition.id} onClick={() => void onRecordOutcome(petition.id)}>
                Record Outcome
              </Button>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
