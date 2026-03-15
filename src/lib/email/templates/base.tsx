import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

type BickosaEmailLayoutProps = {
  previewText: string;
  heading: string;
  children: ReactNode;
};

export const emailStyles = {
  body: {
    margin: 0,
    backgroundColor: "#f7f8fc",
    fontFamily: "Inter, Arial, sans-serif",
    color: "#0d1b3e",
    padding: "24px 12px",
  } satisfies CSSProperties,
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    border: "1px solid #e4e8f2",
    borderRadius: "14px",
    overflow: "hidden",
  } satisfies CSSProperties,
  headerBar: {
    backgroundColor: "#0d1b3e",
    padding: "18px 24px",
  } satisfies CSSProperties,
  brand: {
    margin: 0,
    color: "#c9a84c",
    fontSize: "20px",
    lineHeight: "24px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontFamily: "'Google Sans', 'Product Sans', Arial, sans-serif",
  } satisfies CSSProperties,
  content: {
    padding: "28px 24px",
  } satisfies CSSProperties,
  heading: {
    margin: "0 0 12px 0",
    color: "#0d1b3e",
    fontSize: "28px",
    lineHeight: "34px",
    fontWeight: 700,
    fontFamily: "'Google Sans', 'Product Sans', Arial, sans-serif",
  } satisfies CSSProperties,
  paragraph: {
    margin: "0 0 14px 0",
    color: "#1f315c",
    fontSize: "15px",
    lineHeight: "24px",
  } satisfies CSSProperties,
  ctaButton: {
    display: "inline-block",
    marginTop: "8px",
    marginBottom: "8px",
    borderRadius: "8px",
    backgroundColor: "#0d1b3e",
    color: "#ffffff",
    fontSize: "15px",
    lineHeight: "15px",
    fontWeight: 600,
    padding: "14px 22px",
    textDecoration: "none",
  } satisfies CSSProperties,
  muted: {
    margin: 0,
    color: "#516189",
    fontSize: "13px",
    lineHeight: "20px",
  } satisfies CSSProperties,
  infoCard: {
    margin: "18px 0",
    padding: "16px",
    borderRadius: "12px",
    backgroundColor: "#edf1f8",
    border: "1px solid #d4daf0",
  } satisfies CSSProperties,
  infoLabel: {
    margin: "0 0 4px 0",
    fontSize: "12px",
    lineHeight: "16px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 600,
    color: "#516189",
  } satisfies CSSProperties,
  infoValue: {
    margin: 0,
    fontSize: "15px",
    lineHeight: "22px",
    color: "#0d1b3e",
    fontWeight: 600,
  } satisfies CSSProperties,
  footerBar: {
    backgroundColor: "#0d1b3e",
    padding: "16px 24px",
  } satisfies CSSProperties,
  footerText: {
    margin: 0,
    fontSize: "12px",
    lineHeight: "18px",
    color: "#c6d0e6",
  } satisfies CSSProperties,
} as const;

export function BickosaEmailLayout({
  previewText,
  heading,
  children,
}: BickosaEmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.headerBar}>
            <Text style={emailStyles.brand}>BICKOSA</Text>
          </Section>

          <Section style={emailStyles.content}>
            <Text style={emailStyles.heading}>{heading}</Text>
            {children}
          </Section>

          <Section style={emailStyles.footerBar}>
            <Text style={emailStyles.footerText}>
              Bishop Cipriano Kihangire Old Students&apos; Association
            </Text>
            <Text style={emailStyles.footerText}>Luzira, Kampala, Uganda</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
