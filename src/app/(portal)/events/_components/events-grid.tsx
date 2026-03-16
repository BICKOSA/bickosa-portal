import Link from "next/link";
import { CalendarClock, MapPin, Monitor } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatEventTypeLabel, type EventCardData } from "@/lib/events";
import { cn } from "@/lib/utils";

import { RsvpButton } from "../[slug]/_components/rsvp-button";

type EventsGridProps = {
  events: EventCardData[];
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  month: "short",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function EventCard({ event }: { event: EventCardData }) {
  const dayLabel = String(event.startAt.getDate()).padStart(2, "0");
  const monthLabel = MONTH_FORMATTER.format(event.startAt).toUpperCase();
  const isImageBanner = Boolean(event.bannerUrl);
  const bannerStyle = isImageBanner
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(13,27,62,0.32), rgba(13,27,62,0.72)), url(${event.bannerUrl})`,
      }
    : {
        backgroundImage: `linear-gradient(135deg, ${event.bannerColor ?? "#1a3060"}, #0d1b3e)`,
      };

  return (
    <article className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] shadow-[var(--shadow-sm)]">
      <div
        className={cn(
          "relative h-[100px] bg-cover bg-center",
          isImageBanner ? "" : "bg-[var(--navy-900)]",
        )}
        style={bannerStyle}
      >
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between">
          <div className="rounded-[var(--r-md)] bg-[color:rgba(255,255,255,0.92)] px-2 py-1 text-[var(--navy-900)] shadow-[var(--shadow-sm)]">
            <p className="text-sm leading-none font-semibold">{dayLabel}</p>
            <p className="mt-1 text-[10px] leading-none font-semibold tracking-wide">{monthLabel}</p>
          </div>
          <Badge variant="secondary" className="bg-[color:rgba(255,255,255,0.92)] text-[var(--navy-700)]">
            {formatEventTypeLabel(event.type)}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 font-[var(--font-ui)] text-lg font-semibold text-[var(--navy-900)]">
            <Link href={`/events/${event.slug}`} className="hover:text-[var(--navy-700)]">
              {event.title}
            </Link>
          </h3>
          <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
            <CalendarClock className="size-4 text-[var(--navy-500)]" />
            <span>{DATE_TIME_FORMATTER.format(event.startAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
            {event.isOnline ? (
              <Monitor className="size-4 text-[var(--navy-500)]" />
            ) : (
              <MapPin className="size-4 text-[var(--navy-500)]" />
            )}
            <span className="line-clamp-1">
              {event.isOnline ? "Online Event" : event.locationName ?? event.locationAddress ?? "TBA"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {event.attendeePreview.map((attendee) => (
                <Avatar
                  key={attendee.userId}
                  size="sm"
                  src={attendee.avatarUrl}
                  name={attendee.name}
                  className="border-2 border-[var(--white)]"
                />
              ))}
            </div>
            <span className="text-xs text-[var(--text-3)]">{event.attendeeCount} attending</span>
          </div>
          <RsvpButton event={event} compact />
        </div>
      </div>
    </article>
  );
}

export function EventsGrid({ events }: EventsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
