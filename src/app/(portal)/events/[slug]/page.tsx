import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, MapPin, Monitor, ShieldCheck, Users2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { RsvpButton } from "@/app/(portal)/events/[slug]/_components/rsvp-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { formatEventTypeLabel, getEventDetailBySlug } from "@/lib/events";

type EventDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DEADLINE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatMoney(amount: number, currency: string): string {
  if (amount <= 0) {
    return "Free";
  }
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMapLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const event = await getEventDetailBySlug({
    slug,
    userId: session.user.id,
  });

  if (!event) {
    notFound();
  }

  const dateLabel = DATE_TIME_FORMATTER.format(event.startAt);
  const locationLabel = event.isOnline
    ? "Online Event"
    : event.locationName ?? event.locationAddress ?? "Location TBA";
  const mapAddress = event.locationAddress ?? event.locationName;

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] shadow-[var(--shadow-sm)]">
        <div
          className="relative min-h-[220px] bg-cover bg-center sm:min-h-[280px]"
          style={{
            backgroundImage: event.bannerUrl
              ? `linear-gradient(180deg, rgba(13,27,62,0.2), rgba(13,27,62,0.78)), url(${event.bannerUrl})`
              : `linear-gradient(135deg, ${event.bannerColor ?? "#1a3060"}, #0d1b3e)`,
          }}
        >
          <div className="absolute inset-0 flex items-end p-6 sm:p-8">
            <div className="space-y-3">
              <Badge variant="gold">{formatEventTypeLabel(event.type)}</Badge>
              <h1 className="max-w-3xl font-[var(--font-ui)] text-3xl font-bold text-[var(--white)] sm:text-4xl">
                {event.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-[var(--border)] p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 size-4 text-[var(--navy-500)]" />
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Date & Time</p>
              <p className="mt-1 text-sm text-[var(--text-1)]">{dateLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            {event.isOnline ? (
              <Monitor className="mt-0.5 size-4 text-[var(--navy-500)]" />
            ) : (
              <MapPin className="mt-0.5 size-4 text-[var(--navy-500)]" />
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Location</p>
              <p className="mt-1 text-sm text-[var(--text-1)]">{locationLabel}</p>
              {mapAddress && !event.isOnline ? (
                <Link
                  href={getMapLink(mapAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--navy-700)] hover:underline"
                >
                  Open map
                </Link>
              ) : null}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 text-[var(--navy-500)]" />
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Organizer</p>
              <p className="mt-1 text-sm text-[var(--text-1)]">{event.organizerName}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users2 className="mt-0.5 size-4 text-[var(--navy-500)]" />
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Chapter</p>
              <p className="mt-1 text-sm text-[var(--text-1)]">{event.chapterName ?? "All Chapters"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none text-[var(--text-2)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {event.description ?? "Event details will be shared soon."}
              </ReactMarkdown>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {event.attendees.slice(0, 5).map((attendee) => (
                    <Avatar
                      key={attendee.userId}
                      size="sm"
                      src={attendee.avatarUrl}
                      name={attendee.name ?? "Private attendee"}
                      className="border-2 border-[var(--white)]"
                    />
                  ))}
                </div>
                <p className="text-sm text-[var(--text-2)]">{event.attendeeCount} alumni attending</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {event.attendees.map((attendee) => (
                  <div
                    key={attendee.userId}
                    className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                  >
                    <Avatar size="sm" src={attendee.avatarUrl} name={attendee.name ?? "Private attendee"} />
                    <span className="text-sm text-[var(--text-2)]">
                      {attendee.name ?? "Private attendee"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card accentBar>
            <CardHeader>
              <CardTitle>RSVP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm text-[var(--text-2)]">
                <p>
                  <span className="font-semibold text-[var(--text-1)]">{event.attendeeCount}</span> attending
                </p>
                <p>
                  Price:{" "}
                  <span className="font-semibold text-[var(--text-1)]">
                    {formatMoney(event.ticketPrice, event.currency)}
                  </span>
                </p>
                <p>
                  RSVP deadline:{" "}
                  <span className="font-semibold text-[var(--text-1)]">
                    {event.rsvpDeadline ? DEADLINE_FORMATTER.format(event.rsvpDeadline) : "No deadline"}
                  </span>
                </p>
              </div>
              <RsvpButton
                event={{
                  id: event.id,
                  slug: event.slug,
                  title: event.title,
                  description: event.description,
                  startAt: event.startAt,
                  endAt: event.endAt,
                  locationName: event.locationName,
                  locationAddress: event.locationAddress,
                  isOnline: event.isOnline,
                  onlineUrl: event.onlineUrl,
                  attendeeCount: event.attendeeCount,
                  maxAttendees: event.maxAttendees,
                  rsvpDeadline: event.rsvpDeadline,
                  registrationStatus: event.registrationStatus,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.relatedEvents.length === 0 ? (
                <p className="text-sm text-[var(--text-3)]">No related events yet.</p>
              ) : (
                event.relatedEvents.map((related) => (
                  <Link
                    key={related.id}
                    href={`/portal/events/${related.slug}`}
                    className="block rounded-[var(--r-md)] border border-[var(--border)] p-3 hover:bg-[var(--surface)]"
                  >
                    <p className="font-[var(--font-ui)] text-sm font-semibold text-[var(--text-1)]">
                      {related.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-3)]">
                      {DATE_TIME_FORMATTER.format(related.startAt)}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
