import { createElement, type ReactElement } from "react";
import { Resend } from "resend";

import {
  DonationReceiptTemplate,
  type DonationReceiptTemplateProps,
  EventReminderTemplate,
  type EventReminderTemplateProps,
  MentorshipRequestTemplate,
  type MentorshipRequestTemplateProps,
  NewsletterTemplate,
  type NewsletterTemplateProps,
  PasswordResetTemplate,
  type PasswordResetTemplateProps,
  VerificationApprovedTemplate,
  type VerificationApprovedTemplateProps,
  VerificationRejectedTemplate,
  type VerificationRejectedTemplateProps,
  VerifyEmailTemplate,
  WelcomeTemplate,
  type WelcomeTemplateProps,
} from "@/lib/email/templates";

const appName = "BICKOSA Alumni Portal";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.bickosa.org";
const resendFrom = process.env.RESEND_FROM_EMAIL ?? "BICKOSA <no-reply@bickosa.org>";
const resendApiKey = process.env.RESEND_API_KEY;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function getResendClient(): Resend {
  if (!resend) {
    throw new Error("RESEND_API_KEY is required to send emails.");
  }

  return resend;
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  from?: string;
  text?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
};

export type SendEmailResult = {
  id: string;
};

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const client = getResendClient();

  const response = await client.emails.send({
    from: options.from ?? resendFrom,
    to: options.to,
    subject: options.subject,
    react: options.react,
    text: options.text,
    replyTo: options.replyTo,
    cc: options.cc,
    bcc: options.bcc,
  });

  if (response.error) {
    throw new Error(`Failed to send email via Resend: ${response.error.message}`);
  }

  const id = response.data?.id;
  if (!id) {
    throw new Error("Resend did not return an email id.");
  }

  return { id };
}

export type SendVerificationEmailInput = {
  to: string;
  firstName?: string;
  verificationUrl: string;
};

export function sendVerificationEmail(input: SendVerificationEmailInput) {
  return sendEmail({
    to: input.to,
    subject: `Verify your ${appName} email`,
    react: createElement(VerifyEmailTemplate, {
      firstName: input.firstName,
      verificationUrl: input.verificationUrl,
    }),
    text: `Verify your email address using this link (expires in 24 hours): ${input.verificationUrl}`,
  });
}

export type SendWelcomeEmailInput = {
  to: string;
  firstName: WelcomeTemplateProps["firstName"];
  classYear: WelcomeTemplateProps["classYear"];
  chapterAssigned: WelcomeTemplateProps["chapterAssigned"];
  profileUrl?: WelcomeTemplateProps["profileUrl"];
};

export function sendWelcomeEmail(input: SendWelcomeEmailInput) {
  const profileUrl = input.profileUrl ?? `${appUrl}/profile`;

  return sendEmail({
    to: input.to,
    subject: `Welcome to ${appName}`,
    react: createElement(WelcomeTemplate, {
      firstName: input.firstName,
      classYear: input.classYear,
      chapterAssigned: input.chapterAssigned,
      profileUrl,
    }),
    text: `Welcome to BICKOSA, ${input.firstName}. Complete your profile: ${profileUrl}`,
  });
}

export type SendVerificationApprovedEmailInput = {
  to: string;
  firstName: VerificationApprovedTemplateProps["firstName"];
  membershipTier: VerificationApprovedTemplateProps["membershipTier"];
  portalUrl?: VerificationApprovedTemplateProps["portalUrl"];
};

export function sendVerificationApprovedEmail(input: SendVerificationApprovedEmailInput) {
  const portalUrl = input.portalUrl ?? `${appUrl}/dashboard`;

  return sendEmail({
    to: input.to,
    subject: "Your BICKOSA membership is now verified",
    react: createElement(VerificationApprovedTemplate, {
      firstName: input.firstName,
      membershipTier: input.membershipTier,
      portalUrl,
    }),
    text: `You're now a verified BICKOSA member. Explore the portal: ${portalUrl}`,
  });
}

export type SendVerificationRejectedEmailInput = {
  to: string;
  firstName: VerificationRejectedTemplateProps["firstName"];
  reason: VerificationRejectedTemplateProps["reason"];
  contactUrl?: VerificationRejectedTemplateProps["contactUrl"];
};

export function sendVerificationRejectedEmail(input: SendVerificationRejectedEmailInput) {
  const contactUrl = input.contactUrl ?? `${appUrl}/contact`;

  return sendEmail({
    to: input.to,
    subject: "Update on your BICKOSA verification request",
    react: createElement(VerificationRejectedTemplate, {
      firstName: input.firstName,
      reason: input.reason,
      contactUrl,
    }),
    text: `Verification update: ${input.reason}. Contact us: ${contactUrl}`,
  });
}

export type SendEventReminderEmailInput = {
  to: string;
  firstName: EventReminderTemplateProps["firstName"];
  eventTitle: EventReminderTemplateProps["eventTitle"];
  eventDate: EventReminderTemplateProps["eventDate"];
  eventTime: EventReminderTemplateProps["eventTime"];
  eventLocation: EventReminderTemplateProps["eventLocation"];
  eventDetailsUrl: EventReminderTemplateProps["eventDetailsUrl"];
  googleCalendarUrl: EventReminderTemplateProps["googleCalendarUrl"];
  appleCalendarUrl: EventReminderTemplateProps["appleCalendarUrl"];
};

export function sendEventReminderEmail(input: SendEventReminderEmailInput) {
  return sendEmail({
    to: input.to,
    subject: `Reminder: ${input.eventTitle} in 48 hours`,
    react: createElement(EventReminderTemplate, {
      firstName: input.firstName,
      eventTitle: input.eventTitle,
      eventDate: input.eventDate,
      eventTime: input.eventTime,
      eventLocation: input.eventLocation,
      eventDetailsUrl: input.eventDetailsUrl,
      googleCalendarUrl: input.googleCalendarUrl,
      appleCalendarUrl: input.appleCalendarUrl,
    }),
    text: `Event reminder: ${input.eventTitle} on ${input.eventDate} at ${input.eventTime}, ${input.eventLocation}. Details: ${input.eventDetailsUrl}`,
  });
}

export type SendDonationReceiptEmailInput = {
  to: string;
  firstName: DonationReceiptTemplateProps["firstName"];
  amount: DonationReceiptTemplateProps["amount"];
  campaignName: DonationReceiptTemplateProps["campaignName"];
  donatedOn: DonationReceiptTemplateProps["donatedOn"];
  referenceNumber: DonationReceiptTemplateProps["referenceNumber"];
};

export function sendDonationReceiptEmail(input: SendDonationReceiptEmailInput) {
  return sendEmail({
    to: input.to,
    subject: `Donation receipt: ${input.campaignName}`,
    react: createElement(DonationReceiptTemplate, {
      firstName: input.firstName,
      amount: input.amount,
      campaignName: input.campaignName,
      donatedOn: input.donatedOn,
      referenceNumber: input.referenceNumber,
    }),
    text: `Donation receipt for ${input.campaignName}. Amount: ${input.amount}. Date: ${input.donatedOn}. Reference: ${input.referenceNumber}.`,
  });
}

export type SendPasswordResetEmailInput = {
  to: string;
  firstName?: PasswordResetTemplateProps["firstName"];
  resetUrl: PasswordResetTemplateProps["resetUrl"];
};

export function sendPasswordResetEmail(input: SendPasswordResetEmailInput) {
  return sendEmail({
    to: input.to,
    subject: `${appName} password reset`,
    react: createElement(PasswordResetTemplate, {
      firstName: input.firstName,
      resetUrl: input.resetUrl,
    }),
    text: `Reset your password with this link (expires in 1 hour): ${input.resetUrl}`,
  });
}

export type SendMentorshipRequestEmailInput = {
  to: string;
  mentorName: MentorshipRequestTemplateProps["mentorName"];
  requesterName: MentorshipRequestTemplateProps["requesterName"];
  messagePreview: MentorshipRequestTemplateProps["messagePreview"];
  requestUrl: MentorshipRequestTemplateProps["requestUrl"];
};

export function sendMentorshipRequestEmail(input: SendMentorshipRequestEmailInput) {
  return sendEmail({
    to: input.to,
    subject: `${input.requesterName} sent you a mentorship request`,
    react: createElement(MentorshipRequestTemplate, {
      mentorName: input.mentorName,
      requesterName: input.requesterName,
      messagePreview: input.messagePreview,
      requestUrl: input.requestUrl,
    }),
    text: `${input.requesterName} has sent you a mentorship request. View request: ${input.requestUrl}`,
  });
}

export type SendNewsletterEmailInput = {
  to: string | string[];
  monthLabel: NewsletterTemplateProps["monthLabel"];
  upcomingEvents: NewsletterTemplateProps["upcomingEvents"];
  newMembers: NewsletterTemplateProps["newMembers"];
  campaignUpdate: NewsletterTemplateProps["campaignUpdate"];
  sportsResults: NewsletterTemplateProps["sportsResults"];
  portalUrl?: NewsletterTemplateProps["portalUrl"];
};

export function sendNewsletterEmail(input: SendNewsletterEmailInput) {
  const portalUrl = input.portalUrl ?? `${appUrl}/dashboard`;

  return sendEmail({
    to: input.to,
    subject: `${input.monthLabel} BICKOSA Community Newsletter`,
    react: createElement(NewsletterTemplate, {
      monthLabel: input.monthLabel,
      upcomingEvents: input.upcomingEvents,
      newMembers: input.newMembers,
      campaignUpdate: input.campaignUpdate,
      sportsResults: input.sportsResults,
      portalUrl,
    }),
    text: `${input.monthLabel} newsletter: events, members, campaign and sports updates. Read more: ${portalUrl}`,
  });
}
