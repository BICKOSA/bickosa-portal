import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  findDuplicateProfileMatches,
  getRegistrationWithSchoolMatches,
} from "@/lib/alumni-growth";
import { RegistrationDetailClient } from "@/app/(portal)/portal/admin/registrations/_components/registration-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminRegistrationDetailPage({ params }: PageProps) {
  await requireAdminPageSession();
  const { id } = await params;

  const [{ registration, matches }, duplicateMatches] = await Promise.all([
    getRegistrationWithSchoolMatches(id),
    findDuplicateProfileMatches(id),
  ]);

  if (!registration) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title={`Registration: ${registration.fullName}`}
        description="Review full submission details, apply manual matching decisions, and take action."
      />
      <RegistrationDetailClient
        registration={registration}
        schoolMatches={matches}
        duplicateMatches={duplicateMatches}
      />
    </section>
  );
}
