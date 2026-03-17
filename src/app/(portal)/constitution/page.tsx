import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/auth";
import { getViewerIsVerified, listConstitutionHubData } from "@/lib/constitution";

import { AmendmentCommentForm } from "./_components/amendment-comment-form";

export default async function ConstitutionHubPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const [hub, isVerified] = await Promise.all([
    listConstitutionHubData(),
    getViewerIsVerified(session.user.id, Boolean(session.user.emailVerified)),
  ]);

  return (
    <section className="space-y-6 bg-(--white)">
      <PageHeader
        eyebrow="Governance"
        title="BICKOSA Constitution"
        description="Official constitution versions, active amendment consultations, and AGM petition outcomes."
      />

      <section className="space-y-3 rounded-(--r-lg) border border-border bg-(--white) p-5">
        <h3 className="text-lg font-semibold text-(--text-1)">Current Constitution</h3>
        {hub.currentVersion ? (
          <>
            <p className="text-sm text-(--text-3)">
              {hub.currentVersion.versionTag} · Effective {format(hub.currentVersion.effectiveDate, "MMM d, yyyy")}
            </p>
            <div className="flex flex-wrap gap-2">
              {hub.currentVersion.documentUrl ? (
                <Button asChild variant="gold">
                  <a href={hub.currentVersion.documentUrl} target="_blank" rel="noreferrer">
                    Download Constitution
                  </a>
                </Button>
              ) : null}
            </div>
            <details className="rounded-(--r-md) border border-border bg-(--surface) p-3">
              <summary className="cursor-pointer text-sm font-medium text-(--text-1)">
                What changed in this version
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-(--text-2)">
                {hub.currentVersion.notes ?? "No change notes provided."}
              </p>
            </details>
          </>
        ) : (
          <p className="text-sm text-(--text-3)">No current constitution version published yet.</p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold text-(--text-1)">Previous versions</p>
          {hub.previousVersions.length === 0 ? (
            <p className="text-sm text-(--text-3)">No previous versions available.</p>
          ) : (
            hub.previousVersions.map((version) => (
              <div key={version.id} className="flex items-center justify-between rounded-(--r-md) border border-border p-2">
                <p className="text-sm text-(--text-2)">
                  {version.versionTag} · {format(version.effectiveDate, "MMM d, yyyy")}
                </p>
                {version.documentUrl ? (
                  <a
                    href={version.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-(--navy-700) hover:text-(--navy-900)"
                  >
                    Open PDF
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-(--text-1)">Proposed Amendments</h3>
        {hub.openProposals.length === 0 ? (
          <p className="rounded-(--r-md) border border-border bg-(--white) p-4 text-sm text-(--text-3)">
            No amendments are currently under public review.
          </p>
        ) : (
          <div className="space-y-4">
            {hub.openProposals.map((proposal) => {
              const daysLeft = proposal.commentClosesAt
                ? differenceInCalendarDays(proposal.commentClosesAt, new Date())
                : null;
              return (
                <article key={proposal.id} className="space-y-3 rounded-(--r-lg) border border-border bg-(--white) p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-(--text-1)">{proposal.clauseReference ?? "Clause reference"}</p>
                    <Badge variant="navy">Open for comment</Badge>
                  </div>
                  <blockquote className="rounded-(--r-md) border border-red-100 bg-red-50 p-3 text-sm leading-7 text-(--text-2)">
                    {proposal.currentText ?? "Current text not supplied."}
                  </blockquote>
                  <blockquote className="rounded-(--r-md) border border-green-100 bg-green-50 p-3 text-sm leading-7 text-(--text-2)">
                    {proposal.proposedText ?? "Proposed text not supplied."}
                  </blockquote>
                  <p className="line-clamp-3 text-sm text-(--text-2)">{proposal.rationale}</p>
                  <p className="text-xs text-(--text-3)">
                    {proposal.commentCount} comments
                    {daysLeft !== null ? ` · ${Math.max(0, daysLeft)} days remaining` : ""}
                  </p>
                  {isVerified ? (
                    <AmendmentCommentForm proposalId={proposal.id} compact />
                  ) : (
                    <p className="text-xs text-(--text-3)">
                      Only verified members can comment during the open window.
                    </p>
                  )}
                  <Link
                    href={`/constitution/amendments/${proposal.id}`}
                    className="inline-block text-sm font-medium text-(--navy-700) hover:text-(--navy-900)"
                  >
                    View full amendment details
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-(--text-1)">Past AGM Outcomes</h3>
        <div className="overflow-x-auto rounded-(--r-md) border border-border bg-(--white)">
          <table className="min-w-full text-sm">
            <thead className="bg-(--navy-900) text-(--white)">
              <tr>
                <th className="px-3 py-2 text-left font-medium">AGM Year</th>
                <th className="px-3 py-2 text-left font-medium">Amendment</th>
                <th className="px-3 py-2 text-left font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {hub.petitionRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-(--text-3)">
                    No AGM amendment outcomes recorded yet.
                  </td>
                </tr>
              ) : (
                hub.petitionRows.map((row) => (
                  <tr key={row.petitionId} className="border-b border-border">
                    <td className="px-3 py-2 text-(--text-2)">
                      {row.eventStartAt ? format(row.eventStartAt, "yyyy") : "-"}
                    </td>
                    <td className="px-3 py-2 text-(--text-2)">{row.clauseReference ?? "Amendment"}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          row.outcome === "approved"
                            ? "success"
                            : row.outcome === "deferred"
                              ? "outline"
                              : "error"
                        }
                      >
                        {row.outcome ?? "-"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
