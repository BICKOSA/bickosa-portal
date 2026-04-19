import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/auth";
import { listCommitteesForHub } from "@/lib/committees";

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function nominationStatusLabel(
  status: "pending" | "confirmed_willing" | "appointed",
) {
  if (status === "confirmed_willing") return "Confirmed willing";
  if (status === "appointed") return "Appointed";
  return "Awaiting response";
}

function nominationStatusVariant(
  status: "pending" | "confirmed_willing" | "appointed",
) {
  if (status === "confirmed_willing") return "navy";
  if (status === "appointed") return "success";
  return "warning";
}

export default async function CommitteesHubPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { current, previous } = await listCommitteesForHub();

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Community Governance"
        title="Ad-hoc Committees"
        description="Special-purpose committees formed through open nominations for targeted initiatives and mandates."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {current.map((committee) => (
          <article
            key={committee.id}
            className="border-border rounded-(--r-lg) border bg-(--white) p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-(--text-1)">
                {committee.name}
              </h3>
              <Badge
                variant={
                  committee.status === "nominations_open" ? "navy" : "outline"
                }
              >
                {formatStatus(committee.status)}
              </Badge>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-(--text-2)">
              {committee.purpose}
            </p>
            <p className="mt-3 text-xs text-(--text-3)">
              Nomination deadline:{" "}
              {format(committee.nominationCloses, "MMM d, yyyy 'at' HH:mm")}
            </p>
            <p className="mt-1 text-xs text-(--text-3)">
              Nominations so far: {committee.nominationCount}
              {committee.maxMembers
                ? ` · Target members: ${committee.maxMembers}`
                : ""}
            </p>
            <div className="mt-3 rounded-(--r-md) border border-(--navy-100) bg-(--navy-50) p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-wide text-(--navy-700) uppercase">
                  Community nominations
                </p>
                <span className="text-xs text-(--text-3)">
                  {committee.nominationCount.toLocaleString()} total
                </span>
              </div>
              {committee.latestNominations.length === 0 ? (
                <p className="mt-2 text-xs text-(--text-3)">
                  No nominations submitted yet.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {committee.latestNominations.map((nomination) => (
                    <div
                      key={nomination.nominationId}
                      className="flex items-center justify-between gap-2"
                    >
                      <p className="truncate text-sm font-medium text-(--text-1)">
                        {nomination.nomineeName}
                        {nomination.nomineeYear
                          ? ` · ${nomination.nomineeYear}`
                          : ""}
                      </p>
                      <Badge
                        variant={nominationStatusVariant(nomination.status)}
                      >
                        {nominationStatusLabel(nomination.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3">
              <Button asChild variant="navy">
                <Link href={`/committees/${committee.id}`}>
                  View Nominations
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>

      <details className="border-border rounded-(--r-lg) border bg-(--white) p-4">
        <summary className="cursor-pointer text-sm font-semibold text-(--text-1)">
          Previous Committees
        </summary>
        <div className="mt-3 space-y-2">
          {previous.length === 0 ? (
            <p className="text-sm text-(--text-3)">
              No previous committees yet.
            </p>
          ) : (
            previous.map((committee) => (
              <div
                key={committee.id}
                className="border-border rounded-(--r-md) border bg-(--surface) p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-(--text-1)">
                    {committee.name}
                  </p>
                  <Badge variant="outline">
                    {formatStatus(committee.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-(--text-3)">
                  {committee.nominationCount} nominations · window{" "}
                  {format(committee.nominationOpens, "MMM d, yyyy")} -{" "}
                  {format(committee.nominationCloses, "MMM d, yyyy")}
                </p>
                {committee.latestNominations.length > 0 ? (
                  <p className="mt-2 text-xs text-(--text-2)">
                    Latest:{" "}
                    {committee.latestNominations
                      .map((nomination) => nomination.nomineeName)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </details>
    </section>
  );
}
