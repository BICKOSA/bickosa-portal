import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Award, ChevronRight, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { isAdminUserRole } from "@/lib/auth/roles";
import { getElectionResultsPageData } from "@/lib/voting";

type PageProps = {
  params: Promise<{ cycleId: string }>;
};

export default async function ElectionResultsPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const isAdmin = isAdminUserRole(
    (session.user as { role?: string }).role,
  );

  const { cycleId } = await params;
  const data = await getElectionResultsPageData(cycleId, { isAdmin });
  if (!data) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{data.cycle.title} — Results</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {data.isAdminPreview ? (
                <Badge variant="warning">Admin preview</Badge>
              ) : (
                <Badge variant="success">Published</Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-[var(--text-2)]">
            {data.turnoutCount.toLocaleString()} of{" "}
            {data.eligibleCount.toLocaleString()} eligible members voted (
            {data.turnoutPercent}%)
          </p>
          {data.isAdminPreview ? (
            <p className="rounded-[var(--r-md)] border border-[var(--gold-300)] bg-[var(--gold-50)] px-3 py-2 text-xs text-[var(--gold-800)]">
              These results aren&apos;t public yet. Publish from the admin
              elections dashboard to share with members.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/voting/elections/${data.cycle.id}`}>
                <ArrowLeft className="size-4" /> Back to election
              </Link>
            </Button>
            <Button asChild variant="navy" size="sm">
              <Link href={`/voting/elections/${data.cycle.id}/candidates`}>
                <Users className="size-4" /> View candidates
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {data.positions.map((position) => {
        const totalForPosition = position.items.reduce(
          (sum, item) => sum + item.voteCount,
          0,
        );
        return (
          <Card key={position.positionId}>
            <CardHeader className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{position.positionTitle}</CardTitle>
                <p className="text-xs text-[var(--text-3)]">
                  {totalForPosition.toLocaleString()} total vote
                  {totalForPosition === 1 ? "" : "s"} ·{" "}
                  {position.items.length} candidate
                  {position.items.length === 1 ? "" : "s"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {position.winnerName ? (
                <div className="rounded-[var(--r-lg)] border border-[var(--navy-700)] bg-[var(--navy-900)] p-4">
                  <p className="text-xs uppercase tracking-wide text-[var(--navy-200)]">
                    Winner
                  </p>
                  <p className="mt-1 flex items-center gap-2 font-[var(--font-ui)] text-xl font-semibold text-[var(--gold-500)]">
                    <Award className="size-5" /> {position.winnerName}
                  </p>
                </div>
              ) : (
                <p className="rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text-3)]">
                  No votes recorded for this position yet.
                </p>
              )}
              <div className="space-y-3">
                {position.items.map((item, index) => {
                  const isWinner = index === 0 && item.voteCount > 0;
                  return (
                    <div
                      key={`${position.positionId}-${item.nomineeName}`}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={
                            isWinner
                              ? "font-semibold text-[var(--navy-900)]"
                              : "text-[var(--text-1)]"
                          }
                        >
                          {isWinner ? (
                            <ChevronRight className="mr-1 inline size-3.5 text-[var(--gold-500)]" />
                          ) : null}
                          {item.nomineeName}
                        </span>
                        <span className="tabular-nums text-[var(--text-3)]">
                          {item.voteCount.toLocaleString()} (
                          {item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-[var(--r-full)] bg-[var(--navy-50)]">
                        <div
                          className={`h-full rounded-[var(--r-full)] ${
                            isWinner
                              ? "bg-[var(--gold-500)]"
                              : "bg-[var(--navy-700)]"
                          }`}
                          style={{ width: `${Math.max(2, item.percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/governance"
          className="text-sm font-medium text-[var(--navy-700)] underline-offset-4 hover:underline"
        >
          View Governance Page
        </Link>
      </div>
    </section>
  );
}
