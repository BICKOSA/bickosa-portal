import { Button, Hr, Section, Text } from "@react-email/components";

import { BickosaEmailLayout, emailStyles } from "@/lib/email/templates/base";

export type AnnouncementTemplateProps = {
  /** Main headline shown at the top of the body. */
  title: string;
  /** Optional short summary shown above the body. */
  summary?: string | null;
  /** Body text. Blank lines split into paragraphs. Plain text only. */
  body: string;
  /** Optional CTA button label. Renders only if both ctaLabel + ctaUrl are set. */
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  /** Display name of the admin who sent it. */
  authorName?: string | null;
  /** Where the recipient can manage their notification preferences. */
  preferencesUrl?: string | null;
  /** Recipient's display name, if known. Used for the greeting. */
  recipientName?: string | null;
};

function splitIntoParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function AnnouncementTemplate({
  title,
  summary,
  body,
  ctaLabel,
  ctaUrl,
  authorName,
  preferencesUrl,
  recipientName,
}: AnnouncementTemplateProps) {
  const paragraphs = splitIntoParagraphs(body);
  const showCta = Boolean(ctaLabel && ctaUrl);
  const previewText = summary?.trim() || paragraphs[0] || title;
  const greeting = recipientName
    ? `Hello ${recipientName.split(/\s+/)[0]},`
    : "Hello,";

  return (
    <BickosaEmailLayout previewText={previewText} heading={title}>
      <Text style={emailStyles.paragraph}>{greeting}</Text>

      {summary ? (
        <Section style={emailStyles.infoCard}>
          <Text style={{ ...emailStyles.infoValue, fontWeight: 500 }}>
            {summary}
          </Text>
        </Section>
      ) : null}

      {paragraphs.map((paragraph, index) => (
        <Text key={index} style={emailStyles.paragraph}>
          {paragraph.split("\n").map((line, lineIndex, lines) => (
            <span key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </Text>
      ))}

      {showCta ? (
        <Button href={ctaUrl ?? "#"} style={emailStyles.ctaButton}>
          {ctaLabel}
        </Button>
      ) : null}

      <Hr style={{ borderColor: "#e4e8f2", margin: "24px 0 16px" }} />

      <Text style={emailStyles.muted}>
        Sent on behalf of{" "}
        {authorName ? `${authorName} and ` : ""}the BICKOSA Alumni Association.
        {preferencesUrl
          ? ` Manage which announcements you receive in your portal preferences (${preferencesUrl}).`
          : ""}
      </Text>
    </BickosaEmailLayout>
  );
}
