/**
 * Centralised date/time formatting helpers, all anchored to East Africa Time
 * (Africa/Kampala, UTC+3). The Node runtime is also pinned to this TZ via
 * next.config.ts so server-side formatting matches; this module is mainly
 * useful in client components where the browser would otherwise default to
 * the visitor's locale.
 */

export const APP_TIME_ZONE = "Africa/Kampala";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const weekdayDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: Date | string | number | null | undefined): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "";
}

export function formatDateTime(
  value: Date | string | number | null | undefined,
): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "";
}

export function formatTime(value: Date | string | number | null | undefined): string {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : "";
}

export function formatWeekdayDate(
  value: Date | string | number | null | undefined,
): string {
  const date = toDate(value);
  return date ? weekdayDateFormatter.format(date) : "";
}

/**
 * Build a per-call Intl.DateTimeFormat with EAT pre-set. Use sparingly —
 * prefer the cached formatters above for hot paths.
 */
export function createEatFormatter(
  options: Intl.DateTimeFormatOptions = {},
  locale: string | string[] = "en-GB",
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIME_ZONE,
    ...options,
  });
}
