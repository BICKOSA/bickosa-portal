"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

function getAuthClientBaseURL(): string | undefined {
  const fromEnv = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    ""
  ).replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const pageOrigin = window.location.origin;
    if (!fromEnv) return pageOrigin;
    try {
      return new URL(fromEnv).origin === pageOrigin ? fromEnv : pageOrigin;
    } catch {
      return pageOrigin;
    }
  }

  return fromEnv || undefined;
}

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseURL(),
  plugins: [adminClient()],
});
