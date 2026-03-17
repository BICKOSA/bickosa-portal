import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listAllGovernanceDocumentsForAdmin } from "@/lib/admin-governance";
import { DocumentsAdminClient } from "@/app/(portal)/portal/admin/governance/documents/_components/documents-admin-client";

export default async function AdminGovernanceDocumentsPage() {
  await requireAdminPageSession();
  const documents = await listAllGovernanceDocumentsForAdmin();

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Governance Documents"
        description="Upload, categorize, and publish governance documentation."
      />
      <DocumentsAdminClient initialDocuments={documents} />
    </section>
  );
}
