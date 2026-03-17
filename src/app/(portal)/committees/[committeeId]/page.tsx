import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth/auth";
import { getCommitteeDetail } from "@/lib/committees";

import { CommitteeDetailClient } from "../_components/committee-detail-client";

type PageProps = {
  params: Promise<{ committeeId: string }>;
};

function statusVariant(status: "draft" | "nominations_open" | "nominations_closed" | "active" | "dissolved") {
  if (status === "nominations_open") return "navy";
  if (status === "active") return "success";
  if (status === "dissolved") return "error";
  return "outline";
}

export default async function CommitteeDetailPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { committeeId } = await params;
  const data = await getCommitteeDetail(committeeId);
  if (!data) {
    notFound();
  }

  const isNominationOpen =
    data.committee.status === "nominations_open" &&
    new Date() >= data.committee.nominationOpens &&
    new Date() <= data.committee.nominationCloses;

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Committee Detail"
        title={data.committee.name}
        description="Review the mandate, timeline, and current willing nominees."
      />

      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(data.committee.status)}>
            {data.committee.status.replaceAll("_", " ")}
          </Badge>
          <p className="text-sm text-(--text-3)">
            Nomination window: {format(data.committee.nominationOpens, "MMM d, yyyy HH:mm")} -{" "}
            {format(data.committee.nominationCloses, "MMM d, yyyy HH:mm")}
          </p>
        </div>
        <p className="mt-3 text-sm text-(--text-2)">{data.committee.purpose}</p>
      </div>

      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">Nominations so far (approved only)</h3>
        <div className="mt-3 space-y-2">
          {data.approvedNominations.length === 0 ? (
            <p className="text-sm text-(--text-3)">No approved nominations yet.</p>
          ) : (
            data.approvedNominations.map((nomination) => (
              <article key={nomination.nominationId} className="rounded-(--r-md) border border-border p-3">
                <p className="text-sm font-semibold text-(--text-1)">
                  {nomination.nomineeName}
                  {nomination.nomineeYear ? ` · Class of ${nomination.nomineeYear}` : ""}
                </p>
                <p className="mt-1 text-sm text-(--text-2)">
                  {(nomination.reason ?? "No reason shared.").slice(0, 180)}
                </p>
              </article>
            ))
          )}
        </div>
      </div>

      {isNominationOpen ? (
        <CommitteeDetailClient committeeId={data.committee.id} committeeName={data.committee.name} />
      ) : (
        <div className="rounded-(--r-lg) border border-border bg-(--surface) p-4 text-sm text-(--text-2)">
          Nominations are currently closed for this committee.
        </div>
      )}
    </section>
  );
}
