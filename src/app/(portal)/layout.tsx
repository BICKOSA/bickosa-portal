import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ToastProvider } from "@/components/ui/toast";
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
  role?: string;
};

export default async function PortalLayout({ children }: PortalLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user: SessionUser = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    emailVerified:
      typeof session.user.emailVerified === "boolean"
        ? session.user.emailVerified
        : undefined,
    role: typeof (session.user as { role?: unknown }).role === "string" ? (session.user as { role: string }).role : undefined,
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[var(--surface)] text-[var(--text-1)]">
        <Sidebar user={user} />
        <div className="flex min-h-screen flex-col lg:pl-[252px]">
          <Topbar user={user} />
          <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
