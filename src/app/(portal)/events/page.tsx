import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Calendar, Ticket } from "lucide-react";

import { EventsGrid } from "@/app/(portal)/events/_components/events-grid";
import EventsLoading from "@/app/(portal)/events/loading";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

async function EventsContent({
  userId,
  query,
}: {
  userId: string;
  query: ReturnType<typeof normalizeEventsQuery>;
}) {
  const events = await listEventsForViewer({
    userId,
    query,
  });

  if (events.data.length === 0) {
    if (query.tab === "upcoming") {
      return (
        <EmptyState
          icon={Calendar}
          title="No upcoming events"
          body="Check back soon — the team is planning something great."
        />
      );
    }

    if (query.tab === "mine") {
      return (
        <EmptyState
          icon={Ticket}
          title="You haven't RSVP'd to any events yet"
          action={
            <Button asChild variant="navy">
              <Link href="/events">Browse upcoming events</Link>
            </Button>
          }
        />
      );
    }

    return (
      <EmptyState
        icon={Calendar}
        title="No past events yet"
        body="Past events will appear here after our first activities."
      />
    );
  }

  return <EventsGrid events={events.data} />;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const query = normalizeEventsQuery(resolvedParams);

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
          const href = tab === "upcoming" ? "/events" : `/events?tab=${tab}`;
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

      <Suspense fallback={<EventsLoading />}>
        <EventsContent userId={session.user.id} query={query} />
      </Suspense>
    </section>
  );
}
