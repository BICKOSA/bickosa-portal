import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { alumniProfiles } from "@/lib/db/schema";

import { OnboardingForm } from "./_components/onboarding-form";

export const metadata: Metadata = {
  title: "Complete your BICKOSA profile",
  description:
    "Tell us about your time at Bishop Cipriano Kihangire and how to verify you.",
};

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login?returnTo=/onboarding");
  }

  const existing = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, session.user.id),
    columns: { id: true },
  });

  // If they've already finished onboarding, send them on. The portal layout
  // will route them to the verification gate when applicable.
  if (existing) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[var(--white)] px-4 py-10">
      <div className="mx-auto max-w-[640px]">
        <OnboardingForm
          defaultName={session.user.name ?? ""}
          email={session.user.email ?? ""}
        />
      </div>
    </main>
  );
}
