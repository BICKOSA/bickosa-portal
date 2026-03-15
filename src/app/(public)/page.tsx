import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";

/**
 * Root route: dashboard-only app. Authenticated users go to dashboard;
 * unauthenticated users go to sign-in.
 */
export default async function RootPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/portal/dashboard");
  }

  redirect("/login");
}
