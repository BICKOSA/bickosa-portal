import { Button, Section, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type MentorshipRequestTemplateProps = {
  mentorName: string;
  requesterName: string;
  messagePreview: string;
  requestUrl: string;
};

export function MentorshipRequestTemplate({
  mentorName,
  requesterName,
  messagePreview,
  requestUrl,
}: MentorshipRequestTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText={`${requesterName} sent you a mentorship request.`}
      heading={`${requesterName} has sent you a mentorship request`}
    >
      <Text style={emailStyles.paragraph}>Hello {mentorName},</Text>

      <Section style={emailStyles.infoCard}>
        <Text style={emailStyles.infoLabel}>Message Preview</Text>
        <Text style={{ ...emailStyles.infoValue, fontWeight: 500 }}>
          {messagePreview}
        </Text>
      </Section>

      <Button href={requestUrl} style={emailStyles.ctaButton}>
        View Request
      </Button>
    </BickosaEmailLayout>
  );
}
