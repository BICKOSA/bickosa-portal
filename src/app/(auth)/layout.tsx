import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";

type AuthLayoutProps = {
  children: React.ReactNode;
};

/**
 * Auth routes (login, register, etc.): redirect authenticated users
 * to the dashboard so they don't see sign-in/register pages.
 */
export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/portal/dashboard");
  }

  return <>{children}</>;
}
