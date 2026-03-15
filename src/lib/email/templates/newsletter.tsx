import { Link, Section, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type NewsletterTemplateProps = {
  monthLabel: string;
  upcomingEvents: string[];
  newMembers: string[];
  campaignUpdate: string;
  sportsResults: string;
  portalUrl: string;
};

function renderList(items: string[]) {
  if (items.length === 0) {
    return <Text style={emailStyles.paragraph}>No updates this month.</Text>;
  }

  return items.map((item) => (
    <Text key={item} style={emailStyles.paragraph}>
      • {item}
    </Text>
  ));
}

export function NewsletterTemplate({
  monthLabel,
  upcomingEvents,
  newMembers,
  campaignUpdate,
  sportsResults,
  portalUrl,
}: NewsletterTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText={`BICKOSA ${monthLabel} community newsletter`}
      heading={`${monthLabel} Community Newsletter`}
    >
      <Section style={emailStyles.infoCard}>
        <Text style={emailStyles.infoLabel}>Upcoming Events</Text>
        {renderList(upcomingEvents)}
      </Section>

      <Section style={emailStyles.infoCard}>
        <Text style={emailStyles.infoLabel}>New Members</Text>
        {renderList(newMembers)}
      </Section>

      <Section style={emailStyles.infoCard}>
        <Text style={emailStyles.infoLabel}>Campaign Update</Text>
        <Text style={emailStyles.paragraph}>{campaignUpdate}</Text>
      </Section>

      <Section style={emailStyles.infoCard}>
        <Text style={emailStyles.infoLabel}>Sports Results</Text>
        <Text style={emailStyles.paragraph}>{sportsResults}</Text>
      </Section>

      <Text style={emailStyles.muted}>
        See full stories in the alumni portal:{" "}
        <Link href={portalUrl} style={{ color: "#1a3060" }}>
          {portalUrl}
        </Link>
      </Text>
    </BickosaEmailLayout>
  );
}
