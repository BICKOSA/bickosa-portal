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

function statusVariant(
  status:
    | "draft"
    | "nominations_open"
    | "nominations_closed"
    | "active"
    | "dissolved",
) {
  if (status === "nominations_open") return "navy";
  if (status === "active") return "success";
  if (status === "dissolved") return "error";
  return "outline";
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
        description="Review the mandate, timeline, and community-submitted nominations."
      />

      <div className="border-border rounded-(--r-lg) border bg-(--white) p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(data.committee.status)}>
            {data.committee.status.replaceAll("_", " ")}
          </Badge>
          <p className="text-sm text-(--text-3)">
            Nomination window:{" "}
            {format(data.committee.nominationOpens, "MMM d, yyyy HH:mm")} -{" "}
            {format(data.committee.nominationCloses, "MMM d, yyyy HH:mm")}
          </p>
        </div>
        <p className="mt-3 text-sm text-(--text-2)">{data.committee.purpose}</p>
      </div>

      <div className="border-border rounded-(--r-lg) border bg-(--white) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-(--text-1)">
              Community Nominations
            </h3>
            <p className="text-sm text-(--text-3)">
              Pending, confirmed, and appointed nominations are visible to
              members. Declined nominations remain private.
            </p>
          </div>
          <Badge variant="outline">
            {data.communityNominations.length.toLocaleString()} visible
          </Badge>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {data.communityNominations.length === 0 ? (
            <p className="text-sm text-(--text-3)">
              No nominations submitted yet.
            </p>
          ) : (
            data.communityNominations.map((nomination) => (
              <article
                key={nomination.nominationId}
                className="border-border rounded-(--r-md) border bg-(--surface) p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-(--text-1)">
                      {nomination.nomineeName}
                    </p>
                    <p className="text-xs text-(--text-3)">
                      {nomination.nomineeYear
                        ? `Class of ${nomination.nomineeYear}`
                        : "Alumni"}
                    </p>
                  </div>
                  <Badge variant={nominationStatusVariant(nomination.status)}>
                    {nominationStatusLabel(nomination.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-(--text-2)">
                  {(nomination.reason ?? "No reason shared.").slice(0, 220)}
                </p>
                <p className="mt-2 text-xs text-(--text-3)">
                  Submitted {format(nomination.createdAt, "MMM d, yyyy")}
                </p>
              </article>
            ))
          )}
        </div>
      </div>

      {isNominationOpen ? (
        <CommitteeDetailClient
          committeeId={data.committee.id}
          committeeName={data.committee.name}
        />
      ) : (
        <div className="border-border rounded-(--r-lg) border bg-(--surface) p-4 text-sm text-(--text-2)">
          Nominations are currently closed for this committee.
        </div>
      )}
    </section>
  );
}
