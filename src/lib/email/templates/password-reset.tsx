import { Button, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type PasswordResetTemplateProps = {
  firstName?: string;
  resetUrl: string;
};

export function PasswordResetTemplate({
  firstName,
  resetUrl,
}: PasswordResetTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText="Reset your BICKOSA password."
      heading="Reset your password"
    >
      <Text style={emailStyles.paragraph}>
        {firstName ? `Hello ${firstName},` : "Hello,"} we received a request to
        reset your password.
      </Text>

      <Button href={resetUrl} style={emailStyles.ctaButton}>
        Reset Password
      </Button>

      <Text style={emailStyles.muted}>Reset link expires in 1 hour.</Text>
    </BickosaEmailLayout>
  );
}
