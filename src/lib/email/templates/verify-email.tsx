import { Button, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type VerifyEmailTemplateProps = {
  firstName?: string;
  verificationUrl: string;
};

export function VerifyEmailTemplate({
  firstName,
  verificationUrl,
}: VerifyEmailTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText="Verify your BICKOSA email address."
      heading="Verify your email address"
    >
      <Text style={emailStyles.paragraph}>
        {firstName ? `Hello ${firstName},` : "Hello,"} please confirm your email
        address to activate your BICKOSA Alumni Portal account.
      </Text>

      <Button href={verificationUrl} style={emailStyles.ctaButton}>
        Verify Email
      </Button>

      <Text style={emailStyles.muted}>
        This verification link expires in 24 hours.
      </Text>
    </BickosaEmailLayout>
  );
}
