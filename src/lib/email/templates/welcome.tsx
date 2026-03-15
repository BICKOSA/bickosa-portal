import { Button, Section, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type WelcomeTemplateProps = {
  firstName: string;
  classYear: string;
  chapterAssigned: string;
  profileUrl: string;
};

export function WelcomeTemplate({
  firstName,
  classYear,
  chapterAssigned,
  profileUrl,
}: WelcomeTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText={`Welcome to BICKOSA, ${firstName}!`}
      heading={`Welcome to BICKOSA, ${firstName}!`}
    >
      <Text style={emailStyles.paragraph}>
        Your email has been confirmed and your portal account is ready.
      </Text>

      <Section style={emailStyles.infoCard}>
        <Text style={emailStyles.infoLabel}>Class Of</Text>
        <Text style={emailStyles.infoValue}>{classYear}</Text>
        <Text style={{ ...emailStyles.infoLabel, marginTop: "12px" }}>
          Chapter Assigned
        </Text>
        <Text style={emailStyles.infoValue}>{chapterAssigned}</Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        Your membership is being verified by our team.
      </Text>

      <Button href={profileUrl} style={emailStyles.ctaButton}>
        Complete Your Profile
      </Button>
    </BickosaEmailLayout>
  );
}
