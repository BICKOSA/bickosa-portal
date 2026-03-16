function toCalendarDateTime(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildGoogleCalendarUrl(input: {
  title: string;
  startAt: Date;
  endAt: Date | null;
  description: string | null;
  location: string | null;
}): string {
  const endAt = input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000);

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("dates", `${toCalendarDateTime(input.startAt)}/${toCalendarDateTime(endAt)}`);
  if (input.description) {
    url.searchParams.set("details", input.description);
  }
  if (input.location) {
    url.searchParams.set("location", input.location);
  }

  return url.toString();
}

export function buildIcsContent(input: {
  eventId: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  description: string | null;
  location: string | null;
  sourceUrl: string;
}): string {
  const endAt = input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BICKOSA//Alumni Portal//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.eventId}@portal.bickosa.org`,
    `DTSTAMP:${toCalendarDateTime(new Date())}`,
    `DTSTART:${toCalendarDateTime(input.startAt)}`,
    `DTEND:${toCalendarDateTime(endAt)}`,
    `SUMMARY:${input.title.replace(/\n/g, " ")}`,
    `DESCRIPTION:${(input.description ?? "").replace(/\n/g, "\\n")}`,
    `LOCATION:${(input.location ?? "").replace(/\n/g, " ")}`,
    `URL:${input.sourceUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

export function getEventCalendarLocation(event: {
  locationName: string | null;
  locationAddress: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
}): string | null {
  if (event.isOnline && event.onlineUrl) {
    return event.onlineUrl;
  }

  if (event.locationName && event.locationAddress) {
    return `${event.locationName}, ${event.locationAddress}`;
  }

  return event.locationName ?? event.locationAddress ?? null;
}
