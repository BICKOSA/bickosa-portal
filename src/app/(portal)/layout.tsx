import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { QueryProvider } from "@/components/providers/query-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { alumniProfiles, verificationEvents } from "@/lib/db/schema";
import { PendingVerificationPage } from "@/app/(portal)/_components/pending-verification-page";
import { RejectedVerificationPage } from "@/app/(portal)/_components/rejected-verification-page";

const UNGATED_PREFIXES = ["/profile", "/settings"];

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
  const headerList = await headers();

  const session = await auth.api.getSession({
    headers: headerList,
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

  const isAdmin = user.role === "admin";

  const profile = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, session.user.id),
    columns: { id: true, verificationStatus: true },
  });

  const url = headerList.get("x-pathname") ?? "";

  const isUngatedPath = UNGATED_PREFIXES.some(
    (prefix) => url === prefix || url.startsWith(`${prefix}/`),
  );

  const isVerified = profile?.verificationStatus === "verified";
  const needsGate = !isVerified && !isAdmin && !isUngatedPath;

  let gatedContent: React.ReactNode = null;

  if (needsGate) {
    if (!profile || profile.verificationStatus === "pending") {
      gatedContent = <PendingVerificationPage />;
    } else if (profile.verificationStatus === "rejected") {
      const latestRejection = await db.query.verificationEvents.findFirst({
        where: eq(verificationEvents.alumniProfileId, profile.id),
        orderBy: [desc(verificationEvents.createdAt)],
        columns: { notes: true },
      });
      gatedContent = (
        <RejectedVerificationPage reason={latestRejection?.notes} />
      );
    } else {
      gatedContent = <PendingVerificationPage />;
    }
  }

  return (
    <ToastProvider>
      <QueryProvider>
        <SidebarProvider>
          <Sidebar user={user} />
          <SidebarInset className="min-h-screen bg-[var(--surface)] text-[var(--text-1)]">
            <Topbar user={user} />
            <main className="flex-1 px-4 py-6 pb-8 sm:px-6 lg:px-8">
              {gatedContent ?? children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </QueryProvider>
    </ToastProvider>
  );
}
