import { Button, Section, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type NominationInviteTemplateProps = {
  nomineeName: string;
  positionTitle: string;
  cycleTitle: string;
  nominatorName: string | null;
  optionalNote?: string | null;
  joinUrl: string;
};

export function NominationInviteTemplate({
  nomineeName,
  positionTitle,
  cycleTitle,
  nominatorName,
  optionalNote,
  joinUrl,
}: NominationInviteTemplateProps) {
  const nominator = nominatorName ?? "A fellow alum";
  return (
    <BickosaEmailLayout
      previewText={`You've been nominated for ${positionTitle}.`}
      heading={`You've been nominated for ${positionTitle}`}
    >
      <Text style={emailStyles.paragraph}>Hello {nomineeName},</Text>

      <Text style={emailStyles.paragraph}>
        {nominator} has nominated you for <strong>{positionTitle}</strong> in
        the BICKOSA election cycle <strong>{cycleTitle}</strong>.
      </Text>

      {optionalNote ? (
        <Section style={emailStyles.infoCard}>
          <Text style={emailStyles.infoLabel}>Note from your nominator</Text>
          <Text style={{ ...emailStyles.infoValue, fontWeight: 500 }}>
            {optionalNote}
          </Text>
        </Section>
      ) : null}

      <Text style={emailStyles.paragraph}>
        Join the BICKOSA Alumni Portal to accept your nomination, share your
        manifesto, and stand for election. Verified alumni cast their ballots
        directly in the portal.
      </Text>

      <Button href={joinUrl} style={emailStyles.ctaButton}>
        Join the portal
      </Button>

      <Text style={emailStyles.muted}>
        If the button doesn&apos;t work, copy this link into your browser:
        {" "}
        {joinUrl}
      </Text>
    </BickosaEmailLayout>
  );
}
