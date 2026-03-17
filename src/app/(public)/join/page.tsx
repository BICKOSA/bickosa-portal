import type { Metadata } from "next";
import { Suspense } from "react";

import { JoinRegistrationForm } from "@/app/(public)/join/_components/join-registration-form";

export const metadata: Metadata = {
  title: "Join the BCK Alumni Community",
  description:
    "Register with BICKOSA (Bishop Cipriano Kihangire Old Students Association) and join the verified alumni portal.",
  openGraph: {
    title: "Join the BCK Alumni Community",
    description:
      "Bishop Cipriano Kihangire Old Students Association alumni registration and verification.",
    images: ["/og/join"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Join the BCK Alumni Community",
    description:
      "Bishop Cipriano Kihangire Old Students Association alumni registration and verification.",
    images: ["/og/join"],
  },
};

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-[var(--white)] px-4 py-10">
      <div className="mx-auto max-w-[640px]">
        <Suspense>
          <JoinRegistrationForm />
        </Suspense>
      </div>
    </main>
  );
}
