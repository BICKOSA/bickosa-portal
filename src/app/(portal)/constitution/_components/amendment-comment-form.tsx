"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { submitAmendmentComment } from "@/app/actions/constitution";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export function AmendmentCommentForm(props: {
  proposalId: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [comment, setComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await submitAmendmentComment(props.proposalId, comment);
    setIsSubmitting(false);
    if (!result.ok) {
      toast({ title: "Could not submit comment", description: result.message });
      return;
    }
    toast({ title: "Comment submitted", variant: "success" });
    setComment("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className={props.compact ? "space-y-2" : "space-y-3"}>
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={props.compact ? 3 : 5}
        disabled={props.disabled}
        placeholder="Share your perspective on this proposed amendment..."
      />
      <Button type="submit" variant="navy" isLoading={isSubmitting} disabled={props.disabled}>
        Leave a Comment
      </Button>
    </form>
  );
}
