import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EventsGrid } from "@/app/(portal)/events/_components/events-grid";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth/auth";
import { listEventsForViewer, normalizeEventsQuery } from "@/lib/events";

type EventsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const TAB_LABELS = {
  upcoming: "Upcoming",
  mine: "My RSVPs",
  past: "Past Events",
} as const;

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const query = normalizeEventsQuery(resolvedParams);

  const events = await listEventsForViewer({
    userId: session.user.id,
    query,
  });

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Engage"
        title="Events & RSVPs"
        description="Discover community events, save your seat, and stay connected with fellow alumni."
      />

      <div className="inline-flex w-fit items-center gap-1 rounded-[var(--r-full)] bg-[var(--surface-2)] p-1">
        {(Object.keys(TAB_LABELS) as Array<keyof typeof TAB_LABELS>).map((tab) => {
          const isActive = query.tab === tab;
          const href = tab === "upcoming" ? "/portal/events" : `/portal/events?tab=${tab}`;
          return (
            <Link
              key={tab}
              href={href}
              className={[
                "rounded-[var(--r-full)] px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--white)] text-[var(--text-1)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-2)] hover:text-[var(--text-1)]",
              ].join(" ")}
            >
              {TAB_LABELS[tab]}
            </Link>
          );
        })}
      </div>

      {events.data.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
          <p className="text-sm text-[var(--text-2)]">
            No events found for this tab yet. Check back soon.
          </p>
        </div>
      ) : (
        <EventsGrid events={events.data} />
      )}
    </section>
  );
}
