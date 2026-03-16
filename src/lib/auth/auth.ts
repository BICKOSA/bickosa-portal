import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { dash } from "@better-auth/infra";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  ADMIN_APP_ROLES,
  DEFAULT_APP_USER_ROLE,
  appUserRoleSchema,
} from "@/lib/auth/roles";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email/resend";

const appName = "BICKOSA Alumni Portal";
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export const auth = betterAuth({
  appName,
  baseURL: appUrl,
  trustedOrigins: appUrl ? [appUrl] : [],
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  session: {
    modelName: "sessions",
    expiresIn: 60 * 60 * 24 * 30,
  },
  user: {
    modelName: "users",
  },
  account: {
    modelName: "accounts",
  },
  verification: {
    modelName: "verifications",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        firstName: user.name ?? undefined,
        resetUrl: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        firstName: user.name ?? undefined,
        verificationUrl: url,
      });
    },
  },
  plugins: [
    admin({
      defaultRole: appUserRoleSchema.parse(DEFAULT_APP_USER_ROLE),
      adminRoles: [...ADMIN_APP_ROLES],
    }),
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
});
