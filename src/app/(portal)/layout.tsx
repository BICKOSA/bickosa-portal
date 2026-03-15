import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth/auth";

type PortalLayoutProps = {
  children: React.ReactNode;
};

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean;
};

export default async function PortalLayout({ children }: PortalLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = session.user as SessionUser;

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-1)]">
      <Sidebar user={user} />
      <div className="flex min-h-screen flex-col lg:pl-[252px]">
        <Topbar user={user} />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
