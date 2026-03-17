"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { acceptNomination, declineNomination } from "@/app/actions/committees";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export function CommitteeRespondClient(props: {
  nominationId: string;
  initialStatus: "pending" | "confirmed_willing" | "declined" | "appointed";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [note, setNote] = React.useState("");
  const [busyAction, setBusyAction] = React.useState<"accept" | "decline" | null>(null);

  async function onAccept() {
    setBusyAction("accept");
    const result = await acceptNomination(props.nominationId, note);
    setBusyAction(null);
    if (!result.ok) {
      toast({ title: "Could not accept nomination", description: result.message });
      return;
    }
    toast({ title: "Nomination accepted", description: result.message, variant: "success" });
    router.refresh();
  }

  async function onDecline() {
    setBusyAction("decline");
    const result = await declineNomination(props.nominationId, note);
    setBusyAction(null);
    if (!result.ok) {
      toast({ title: "Could not decline nomination", description: result.message });
      return;
    }
    toast({ title: "Nomination declined", description: result.message, variant: "success" });
    router.refresh();
  }

  if (props.initialStatus !== "pending") {
    return (
      <div className="rounded-(--r-lg) border border-border bg-(--surface) p-4 text-sm text-(--text-2)">
        This nomination has already been responded to.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-(--r-lg) border border-border bg-(--white) p-4">
      <h3 className="text-base font-semibold text-(--text-1)">Respond to Nomination</h3>
      <p className="text-sm text-(--text-3)">
        You can accept or decline. Add an optional note for transparency.
      </p>
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={4}
        placeholder="Optional note (e.g. I'm happy to serve and will focus on...)"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="navy" isLoading={busyAction === "accept"} onClick={() => void onAccept()}>
          Accept this nomination
        </Button>
        <Button variant="outline" isLoading={busyAction === "decline"} onClick={() => void onDecline()}>
          Decline
        </Button>
      </div>
    </div>
  );
}
