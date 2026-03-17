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
          <article key={committee.id} className="rounded-(--r-lg) border border-border bg-(--white) p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-(--text-1)">{committee.name}</h3>
              <Badge variant={committee.status === "nominations_open" ? "navy" : "outline"}>
                {formatStatus(committee.status)}
              </Badge>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-(--text-2)">{committee.purpose}</p>
            <p className="mt-3 text-xs text-(--text-3)">
              Nomination deadline: {format(committee.nominationCloses, "MMM d, yyyy 'at' HH:mm")}
            </p>
            <p className="mt-1 text-xs text-(--text-3)">
              Nominations so far: {committee.nominationCount}
              {committee.maxMembers ? ` · Target members: ${committee.maxMembers}` : ""}
            </p>
            <div className="mt-3">
              <Button asChild variant="navy">
                <Link href={`/committees/${committee.id}`}>Nominate Someone</Link>
              </Button>
            </div>
          </article>
        ))}
      </div>

      <details className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <summary className="cursor-pointer text-sm font-semibold text-(--text-1)">Previous Committees</summary>
        <div className="mt-3 space-y-2">
          {previous.length === 0 ? (
            <p className="text-sm text-(--text-3)">No previous committees yet.</p>
          ) : (
            previous.map((committee) => (
              <div key={committee.id} className="rounded-(--r-md) border border-border bg-(--surface) p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-(--text-1)">{committee.name}</p>
                  <Badge variant="outline">{formatStatus(committee.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-(--text-3)">
                  {committee.nominationCount} nominations · window{" "}
                  {format(committee.nominationOpens, "MMM d, yyyy")} -{" "}
                  {format(committee.nominationCloses, "MMM d, yyyy")}
                </p>
              </div>
            ))
          )}
        </div>
      </details>
    </section>
  );
}
