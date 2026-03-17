export const portalAnalyticsEvents = [
  "user_registered",
  "user_login",
  "email_verified",
  "profile_completed",
  "directory_search",
  "alumni_profile_viewed",
  "message_sent",
  "event_page_viewed",
  "event_rsvp",
  "event_rsvp_cancelled",
  "event_calendar_export",
  "donation_modal_opened",
  "donation_amount_selected",
  "donation_started",
  "donation_completed",
  "donation_modal_abandoned",
  "standings_viewed",
  "fixture_viewed",
  "mentor_browse",
  "mentorship_request_sent",
  "mentorship_request_accepted",
] as const;

export type PortalAnalyticsEventName = (typeof portalAnalyticsEvents)[number];

export type PortalAnalyticsProperties = Record<string, string | number | boolean | null>;
