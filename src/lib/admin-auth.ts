import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { isAdminUserRole } from "@/lib/auth/roles";

export async function requireAdminPageSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;
  if (!isAdminUserRole(role)) {
    redirect("/dashboard");
  }

  return session;
}

export async function requireAdminApiSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      error: NextResponse.json({ message: "Unauthorized." }, { status: 401 }),
      session: null,
    };
  }

  const role = (session.user as { role?: string }).role;
  if (!isAdminUserRole(role)) {
    return {
      error: NextResponse.json({ message: "Forbidden." }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}
