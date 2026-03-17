"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectField,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type MemberVerificationActionsProps = {
  profileId: string;
  chapterOptions: Array<{ id: string; name: string }>;
};

export function MemberVerificationActions({
  profileId,
  chapterOptions,
}: MemberVerificationActionsProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isBusy, setIsBusy] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("auto");
  const [rejectReason, setRejectReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [openSuspendDialog, setOpenSuspendDialog] = useState(false);

  async function submitAction(action: "approve" | "reject" | "suspend", notes?: string) {
    setIsBusy(true);
    try {
      const payload: {
        action: "approve" | "reject" | "suspend";
        notes?: string;
        chapterId?: string;
      } = { action };

      if (notes?.trim()) {
        payload.notes = notes.trim();
      }

      if (action === "approve" && selectedChapterId !== "auto") {
        payload.chapterId = selectedChapterId;
      }

      const response = await fetch(`/api/admin/members/${profileId}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Failed to process verification action.");
      }

      toast({
        title:
          action === "approve"
            ? "Member approved"
            : action === "reject"
              ? "Member rejected"
              : "Member suspended",
        variant: "success",
      });

      setOpenRejectDialog(false);
      setOpenSuspendDialog(false);
      setRejectReason("");
      setSuspendReason("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <SelectField
        label="Chapter Assignment on Approval"
        helperText="Choose a chapter now or leave it on auto-assign by location country."
      >
        <Select value={selectedChapterId} onValueChange={(value) => setSelectedChapterId(value ?? "auto")}>
          <SelectTrigger>
            <SelectValue placeholder="Auto-assign by location country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-assign by location country</SelectItem>
            {chapterOptions.map((chapter) => (
              <SelectItem key={chapter.id} value={chapter.id}>
                {chapter.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SelectField>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="navy" isLoading={isBusy} onClick={() => void submitAction("approve")}>
          Approve Member
        </Button>
        <Button type="button" variant="outline" disabled={isBusy} onClick={() => setOpenRejectDialog(true)}>
          Reject
        </Button>
        <Button type="button" variant="outline" disabled={isBusy} onClick={() => setOpenSuspendDialog(true)}>
          Suspend
        </Button>
      </div>

      <Dialog open={openRejectDialog} onOpenChange={setOpenRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Member Verification</DialogTitle>
            <DialogDescription>
              This reason is required and will be included in the rejection email.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            label="Rejection reason"
            rows={5}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Explain what should be corrected or provided."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="navy"
              disabled={!rejectReason.trim()}
              isLoading={isBusy}
              onClick={() => void submitAction("reject", rejectReason)}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openSuspendDialog} onOpenChange={setOpenSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Member</DialogTitle>
            <DialogDescription>
              Suspension disables member access. Include notes for future audit reference.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            label="Suspension notes (optional)"
            rows={5}
            value={suspendReason}
            onChange={(event) => setSuspendReason(event.target.value)}
            placeholder="Reason for suspension."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenSuspendDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="navy"
              isLoading={isBusy}
              onClick={() => void submitAction("suspend", suspendReason)}
            >
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
