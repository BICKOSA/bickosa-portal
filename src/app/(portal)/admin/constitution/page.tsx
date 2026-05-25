import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  listAgmPetitionsForAdmin,
  listAmendmentProposalsForAdmin,
  listConstitutionVersionsForAdmin,
  listUpcomingAgmEvents,
} from "@/lib/constitution";

import { ConstitutionAdminClient } from "./_components/constitution-admin-client";

export default async function AdminConstitutionPage() {
  await requireAdminPageSession();

  const [versions, proposals, petitions, agmEvents] = await Promise.all([
    listConstitutionVersionsForAdmin(),
    listAmendmentProposalsForAdmin(),
    listAgmPetitionsForAdmin(),
    listUpcomingAgmEvents(),
  ]);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Constitution Management"
        description="Manage official versions, amendment proposals, public consultation, and AGM petition outcomes."
      />
      <ConstitutionAdminClient
        versions={versions}
        proposals={proposals}
        petitions={petitions}
        agmEvents={agmEvents}
      />
    </section>
  );
}
