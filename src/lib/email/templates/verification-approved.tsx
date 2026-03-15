import { Button, Section, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type VerificationApprovedTemplateProps = {
  firstName: string;
  membershipTier: string;
  portalUrl: string;
};

export function VerificationApprovedTemplate({
  firstName,
  membershipTier,
  portalUrl,
}: VerificationApprovedTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText="Your BICKOSA membership has been verified."
      heading="You&apos;re now a verified BICKOSA member 🎉"
    >
      <Text style={emailStyles.paragraph}>
        Congratulations {firstName}, your profile has been approved by the
        BICKOSA verification team.
      </Text>

      <Section
        style={{
          ...emailStyles.infoCard,
          backgroundColor: "#f9f3df",
          borderColor: "#e8d7a5",
        }}
      >
        <Text style={emailStyles.infoLabel}>Membership Tier</Text>
        <Text style={emailStyles.infoValue}>{membershipTier}</Text>
      </Section>

      <Button href={portalUrl} style={emailStyles.ctaButton}>
        Explore the Alumni Portal
      </Button>
    </BickosaEmailLayout>
  );
}
