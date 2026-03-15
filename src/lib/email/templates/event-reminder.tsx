import { Button, Link, Section, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type EventReminderTemplateProps = {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventDetailsUrl: string;
  googleCalendarUrl: string;
  appleCalendarUrl: string;
};

export function EventReminderTemplate({
  firstName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  eventDetailsUrl,
  googleCalendarUrl,
  appleCalendarUrl,
}: EventReminderTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText={`48-hour reminder: ${eventTitle}`}
      heading="Your BICKOSA event is coming up"
    >
      <Text style={emailStyles.paragraph}>
        Hello {firstName}, this is a friendly 48-hour reminder for an event
        you RSVP&apos;d to.
      </Text>

      <Section style={emailStyles.infoCard}>
        <Text style={emailStyles.infoLabel}>Event</Text>
        <Text style={emailStyles.infoValue}>{eventTitle}</Text>
        <Text style={{ ...emailStyles.infoLabel, marginTop: "12px" }}>Date</Text>
        <Text style={emailStyles.infoValue}>{eventDate}</Text>
        <Text style={{ ...emailStyles.infoLabel, marginTop: "12px" }}>Time</Text>
        <Text style={emailStyles.infoValue}>{eventTime}</Text>
        <Text style={{ ...emailStyles.infoLabel, marginTop: "12px" }}>
          Location
        </Text>
        <Text style={emailStyles.infoValue}>{eventLocation}</Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        Add to Calendar:{" "}
        <Link href={googleCalendarUrl} style={{ color: "#1a3060" }}>
          Google Calendar
        </Link>{" "}
        |{" "}
        <Link href={appleCalendarUrl} style={{ color: "#1a3060" }}>
          Apple Calendar
        </Link>
      </Text>

      <Button href={eventDetailsUrl} style={emailStyles.ctaButton}>
        View Event Details
      </Button>
    </BickosaEmailLayout>
  );
}
