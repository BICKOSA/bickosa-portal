import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { dash } from "@better-auth/infra";
import { Resend } from "resend";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const appName = "BICKOSA Alumni Portal";
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL ?? "BICKOSA <no-reply@bickosa.org>";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function sendAuthEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is required to send auth emails.");
  }

  await resend.emails.send({
    from: resendFrom,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}

export const auth = betterAuth({
  appName,
  baseURL: appUrl,
  trustedOrigins: appUrl ? [appUrl] : [],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  session: {
    modelName: "sessions",
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    // BetterAuth uses 24h when rememberMe is false.
    expiresIn: 60 * 60 * 24 * 30,
  },
  user: {
    modelName: "users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    modelName: "accounts",
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    modelName: "verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: `${appName} password reset`,
        text: `Reset your password using this link: ${url}`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; color: #0d1b3e;">
            <h2 style="margin: 0 0 12px 0;">Reset your password</h2>
            <p style="margin: 0 0 12px 0;">Use the link below to set a new password for your account.</p>
            <p style="margin: 0 0 16px 0;">
              <a href="${url}" style="background:#c9a84c;color:#0d1b3e;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600;">
                Reset password
              </a>
            </p>
            <p style="margin: 0;">If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: `Verify your ${appName} email`,
        text: `Verify your email using this link: ${url}`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; color: #0d1b3e;">
            <h2 style="margin: 0 0 12px 0;">Verify your email</h2>
            <p style="margin: 0 0 12px 0;">Confirm your account to continue to the BICKOSA portal.</p>
            <p style="margin: 0 0 16px 0;">
              <a href="${url}" style="background:#0d1b3e;color:#ffffff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600;">
                Verify email
              </a>
            </p>
            <p style="margin: 0;">If you did not create this account, ignore this email.</p>
          </div>
        `,
      });
    },
  },
  plugins: [
    admin({
      defaultRole: "member",
      adminRoles: ["admin"],
    }),
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
});
