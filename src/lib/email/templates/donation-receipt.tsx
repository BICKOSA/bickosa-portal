import { Section, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type DonationReceiptTemplateProps = {
  firstName: string;
  amount: string;
  campaignName: string;
  donatedOn: string;
  referenceNumber: string;
};

export function DonationReceiptTemplate({
  firstName,
  amount,
  campaignName,
  donatedOn,
  referenceNumber,
}: DonationReceiptTemplateProps) {
  return (
    <BickosaEmailLayout
      previewText={`Receipt for your ${campaignName} donation`}
      heading={`Thank you, ${firstName}!`}
    >
      <Text style={emailStyles.paragraph}>
        We appreciate your contribution to BICKOSA community initiatives.
      </Text>

      <Section style={emailStyles.infoCard}>
        <Text style={emailStyles.infoLabel}>Donation Amount</Text>
        <Text style={emailStyles.infoValue}>{amount}</Text>
        <Text style={{ ...emailStyles.infoLabel, marginTop: "12px" }}>
          Campaign Name
        </Text>
        <Text style={emailStyles.infoValue}>{campaignName}</Text>
        <Text style={{ ...emailStyles.infoLabel, marginTop: "12px" }}>
          Donation Date
        </Text>
        <Text style={emailStyles.infoValue}>{donatedOn}</Text>
        <Text style={{ ...emailStyles.infoLabel, marginTop: "12px" }}>
          Reference Number
        </Text>
        <Text style={emailStyles.infoValue}>{referenceNumber}</Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        This receipt confirms your donation was received on {donatedOn} for the
        purpose of {campaignName}.
      </Text>

      <Text style={emailStyles.muted}>Please keep this receipt for your records.</Text>
    </BickosaEmailLayout>
  );
}
