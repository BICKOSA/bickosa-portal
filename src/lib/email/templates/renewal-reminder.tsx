import { Button, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type RenewalReminderTemplateProps = {
  firstName: string;
  expiryDate: string;
  renewalUrl: string;
};

export function RenewalReminderTemplate({
  firstName,
  expiryDate,
  renewalUrl,
}: RenewalReminderTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText="Membership renewal reminder"
      heading="Your membership is due for renewal"
    >
      <Text style={emailStyles.paragraph}>
        Hello {firstName}, your BICKOSA membership will expire on {expiryDate}.
      </Text>
      <Text style={emailStyles.paragraph}>
        Renewing early keeps your access to the alumni directory, events, mentorship, and giving
        opportunities active without interruption.
      </Text>
      <Button href={renewalUrl} style={emailStyles.ctaButton}>
        Renew Membership
      </Button>
      <Text style={emailStyles.muted}>
        If you already renewed, you can ignore this email.
      </Text>
    </BickosaEmailLayout>
  );
}
