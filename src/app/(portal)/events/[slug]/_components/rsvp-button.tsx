"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Check, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildGoogleCalendarUrl, buildIcsContent, getEventCalendarLocation } from "@/lib/events-calendar";
import type { EventRegistrationStatus } from "@/lib/events";

type RsvpButtonEvent = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  startAt: Date | string;
  endAt: Date | string | null;
  locationName: string | null;
  locationAddress: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
  attendeeCount: number;
  maxAttendees: number | null;
  rsvpDeadline: Date | string | null;
  registrationStatus: EventRegistrationStatus;
};

type RsvpButtonProps = {
  event: RsvpButtonEvent;
  compact?: boolean;
};

type RsvpApiResponse = {
  status: EventRegistrationStatus;
  attendeeCount: number;
};

function toDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

export function RsvpButton({ event, compact = false }: RsvpButtonProps) {
  const { toast } = useToast();
  const [registrationStatus, setRegistrationStatus] = useState<EventRegistrationStatus>(
    event.registrationStatus,
  );
  const [attendeeCount, setAttendeeCount] = useState(event.attendeeCount);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startAt = useMemo(() => toDate(event.startAt) ?? new Date(), [event.startAt]);
  const endAt = useMemo(() => toDate(event.endAt), [event.endAt]);
  const rsvpDeadline = useMemo(() => toDate(event.rsvpDeadline), [event.rsvpDeadline]);

  const isAttending = registrationStatus === "attending";
  const isPast = (endAt ?? startAt).getTime() < Date.now();
  const isDeadlinePassed = Boolean(rsvpDeadline && rsvpDeadline.getTime() < Date.now());
  const isFull = Boolean(event.maxAttendees && attendeeCount >= event.maxAttendees);
  const canRsvp = !isPast && !isDeadlinePassed && (!isFull || isAttending);

  async function handleRsvp() {
    if (isSubmitting || !canRsvp || isAttending) {
      return;
    }

    setIsSubmitting(true);
    setRegistrationStatus("attending");
    setAttendeeCount((previous) => previous + 1);

    try {
      const response = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to RSVP.");
      }

      const payload = (await response.json()) as RsvpApiResponse;
      setRegistrationStatus(payload.status);
      setAttendeeCount(payload.attendeeCount);
      toast({
        title: "RSVP confirmed!",
        description: "You'll receive a reminder 48h before.",
        variant: "success",
      });
    } catch {
      setRegistrationStatus(event.registrationStatus);
      setAttendeeCount(event.attendeeCount);
      toast({
        title: "Could not confirm RSVP",
        description: "Please try again in a moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (isSubmitting || !isAttending) {
      return;
    }

    setIsSubmitting(true);
    setRegistrationStatus("cancelled");
    setAttendeeCount((previous) => Math.max(0, previous - 1));

    try {
      const response = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to cancel RSVP.");
      }

      const payload = (await response.json()) as RsvpApiResponse;
      setRegistrationStatus(payload.status);
      setAttendeeCount(payload.attendeeCount);
      toast({
        title: "RSVP cancelled",
        description: "You can RSVP again anytime before the deadline.",
      });
    } catch {
      setRegistrationStatus("attending");
      setAttendeeCount((previous) => previous + 1);
      toast({
        title: "Could not cancel RSVP",
        description: "Please try again in a moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function downloadIcs() {
    const location = getEventCalendarLocation(event);
    const sourceUrl = `${window.location.origin}/portal/events/${event.slug}`;
    const content = buildIcsContent({
      eventId: event.id,
      title: event.title,
      startAt,
      endAt,
      description: event.description ?? null,
      location,
      sourceUrl,
    });

    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${event.slug || "event"}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const location = getEventCalendarLocation(event);
  const googleCalendarUrl = buildGoogleCalendarUrl({
    title: event.title,
    startAt,
    endAt,
    description: event.description ?? null,
    location,
  });

  if (isPast) {
    return (
      <Button type="button" size={compact ? "sm" : "md"} variant="outline" disabled>
        Event Passed
      </Button>
    );
  }

  if (!isAttending && isFull) {
    return (
      <Button type="button" size={compact ? "sm" : "md"} variant="outline" disabled>
        Sold Out
      </Button>
    );
  }

  if (!isAttending && isDeadlinePassed) {
    return (
      <Button type="button" size={compact ? "sm" : "md"} variant="outline" disabled>
        RSVP Closed
      </Button>
    );
  }

  if (isAttending) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size={compact ? "sm" : "md"}
          variant="secondary"
          className="border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)] hover:bg-[var(--success-bg)]"
          disabled={isSubmitting}
        >
          <Check className="size-4" />
          Attending
        </Button>
        <Button
          type="button"
          size={compact ? "sm" : "md"}
          variant="ghost"
          className="text-[var(--text-3)] hover:text-[var(--error)]"
          onClick={handleCancel}
          isLoading={isSubmitting}
        >
          {!compact ? <X className="size-4" /> : null}
          Cancel
        </Button>
        {!compact ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] px-3 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--navy-50)]"
              aria-label="Add event to calendar"
            >
              <CalendarPlus className="size-4" />
              Add to Calendar
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem
                onClick={() => {
                  window.open(googleCalendarUrl, "_blank", "noopener,noreferrer");
                }}
              >
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadIcs}>Download ICS</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    );
  }

  return (
    <Button
      type="button"
      size={compact ? "sm" : "md"}
      variant="navy"
      onClick={handleRsvp}
      isLoading={isSubmitting}
      disabled={!canRsvp}
    >
      RSVP
    </Button>
  );
}
