import { Link, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type VerificationRejectedTemplateProps = {
  firstName: string;
  reason: string;
  contactUrl: string;
};

export function VerificationRejectedTemplate({
  firstName,
  reason,
  contactUrl,
}: VerificationRejectedTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText="An update on your BICKOSA verification status."
      heading="Verification update"
    >
      <Text style={emailStyles.paragraph}>
        Dear {firstName}, thank you for registering with BICKOSA. We could not
        verify your membership details at this time.
      </Text>

      <Text style={emailStyles.paragraph}>
        <strong>Admin notes:</strong> {reason}
      </Text>

      <Text style={emailStyles.paragraph}>
        Please review the notes above and reach out to our team so we can help
        you complete verification.
      </Text>

      <Text style={emailStyles.muted}>
        Contact us:{" "}
        <Link href={contactUrl} style={{ color: "#1a3060" }}>
          {contactUrl}
        </Link>
      </Text>
    </BickosaEmailLayout>
  );
}
