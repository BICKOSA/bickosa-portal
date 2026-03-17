import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
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

  const { cycleId } = await params;
  const data = await getElectionResultsPageData(cycleId);
  if (!data) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{data.cycle.title} — Results</CardTitle>
          <p className="text-sm text-[var(--text-2)]">
            {data.turnoutCount} of {data.eligibleCount} eligible members voted ({data.turnoutPercent}%)
          </p>
        </CardHeader>
      </Card>

      {data.positions.map((position) => (
        <Card key={position.positionId}>
          <CardHeader>
            <CardTitle>{position.positionTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[var(--r-lg)] border border-[var(--navy-700)] bg-[var(--navy-900)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--navy-200)]">Winner</p>
              <p className="mt-1 font-[var(--font-ui)] text-xl font-semibold text-[var(--gold-500)]">
                {position.winnerName ?? "No winner"}
              </p>
            </div>
            <div className="space-y-3">
              {position.items.map((item) => (
                <div key={`${position.positionId}-${item.nomineeName}`} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-1)]">{item.nomineeName}</span>
                    <span className="text-[var(--text-3)]">
                      {item.voteCount} votes ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-[var(--r-full)] bg-[var(--navy-100)]">
                    <div
                      className="h-full rounded-[var(--r-full)] bg-[var(--navy-700)]"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div>
        <Link href="/governance" className="text-sm font-medium text-[var(--navy-700)] underline-offset-4 hover:underline">
          View Governance Page
        </Link>
      </div>
    </section>
  );
}
