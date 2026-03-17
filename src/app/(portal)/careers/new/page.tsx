import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PostJobForm } from "@/app/(portal)/careers/_components/post-job-form";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth/auth";
import { getViewerIsVerified } from "@/lib/directory";

export default async function NewCareerPostingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const isVerifiedMember = await getViewerIsVerified(
    session.user.id,
    Boolean((session.user as { emailVerified?: boolean }).emailVerified),
  );

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Career Growth"
        title="Post a Job"
        description="Share an opportunity with verified BICKOSA members and help alumni advance their careers."
      />
      <PostJobForm isVerifiedMember={isVerifiedMember} />
    </section>
  );
}
