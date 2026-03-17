import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth/auth";
import { getAmendmentProposalDetail, getViewerIsVerified } from "@/lib/constitution";

import { AmendmentCommentForm } from "../../_components/amendment-comment-form";

type PageProps = {
  params: Promise<{ proposalId: string }>;
};

const timeline: Array<{
  key: "draft" | "open_for_comment" | "under_review" | "petition_raised" | "approved" | "deferred";
  label: string;
}> = [
  { key: "draft", label: "Draft" },
  { key: "open_for_comment", label: "Open for Comment" },
  { key: "under_review", label: "Under Review" },
  { key: "petition_raised", label: "Petition Raised" },
  { key: "approved", label: "Outcome" },
];

function isTimelineStepComplete(
  current: "draft" | "open_for_comment" | "under_review" | "petition_raised" | "approved" | "deferred",
  step: (typeof timeline)[number]["key"],
) {
  if (current === "deferred") {
    return step === "draft" || step === "open_for_comment" || step === "under_review" || step === "petition_raised" || step === "approved";
  }
  const order = ["draft", "open_for_comment", "under_review", "petition_raised", "approved"] as const;
  return order.indexOf(step as (typeof order)[number]) <= order.indexOf(current as (typeof order)[number]);
}

export default async function AmendmentProposalDetailPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { proposalId } = await params;
  const detail = await getAmendmentProposalDetail(proposalId);
  if (!detail) {
    notFound();
  }

  const isVerified = await getViewerIsVerified(session.user.id, Boolean(session.user.emailVerified));
  const commentsOpen =
    detail.proposal.status === "open_for_comment" &&
    (!detail.proposal.commentClosesAt || new Date() <= detail.proposal.commentClosesAt);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Constitution Amendment"
        title={detail.proposal.clauseReference ?? "Amendment Proposal"}
        description={`Proposed by ${detail.proposal.proposedByName ?? "Committee member"} · ${
          detail.proposal.constitutionVersionTag ?? "Unversioned"
        }`}
      />

      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <div className="flex flex-wrap gap-2">
          {timeline.map((step) => (
            <div key={step.key} className="inline-flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  isTimelineStepComplete(detail.proposal.status, step.key)
                    ? "bg-(--navy-900)"
                    : "bg-(--border)"
                }`}
              />
              <span className="text-xs text-(--text-3)">{step.label}</span>
            </div>
          ))}
          {detail.proposal.status === "deferred" ? <Badge variant="outline">Deferred</Badge> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-(--r-lg) border border-red-100 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-(--text-1)">Current text</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-(--text-2)">
            {detail.proposal.currentText ?? "Current text unavailable."}
          </p>
        </article>
        <article className="rounded-(--r-lg) border border-green-100 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-(--text-1)">Proposed text</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-(--text-2)">
            {detail.proposal.proposedText ?? "Proposed text unavailable."}
          </p>
        </article>
      </div>

      <article className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">Rationale</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-(--text-2)">{detail.proposal.rationale}</p>
      </article>

      <section className="space-y-3 rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">Comment thread</h3>
        {detail.comments.length === 0 ? (
          <p className="text-sm text-(--text-3)">No comments yet.</p>
        ) : (
          <div className="space-y-2">
            {detail.comments.map((comment) => (
              <article key={comment.id} className="rounded-(--r-md) border border-border bg-(--white) p-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-(--navy-900) text-xs font-semibold text-(--white)">
                    {comment.authorName.slice(0, 1).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-(--text-1)">{comment.authorName}</p>
                  <p className="text-xs text-(--text-3)">{format(comment.createdAt, "MMM d, yyyy HH:mm")}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-(--text-2)">{comment.comment}</p>
              </article>
            ))}
          </div>
        )}

        {isVerified ? (
          commentsOpen ? (
            <AmendmentCommentForm proposalId={detail.proposal.id} />
          ) : (
            <p className="text-sm text-(--text-3)">
              Commenting is closed for this amendment proposal.
            </p>
          )
        ) : (
          <p className="text-sm text-(--text-3)">Only verified members can comment.</p>
        )}
      </section>
    </section>
  );
}
