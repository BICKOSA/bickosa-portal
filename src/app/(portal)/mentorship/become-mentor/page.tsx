import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { BecomeMentorForm } from "@/app/(portal)/mentorship/become-mentor/_components/become-mentor-form";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { alumniProfiles, mentorshipPreferences } from "@/lib/db/schema";
import { MENTORSHIP_FOCUS_AREAS, type MentorshipFocusArea } from "@/lib/mentorship";

export default async function BecomeMentorPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const [profile, preferences] = await Promise.all([
    db.query.alumniProfiles.findFirst({
      where: eq(alumniProfiles.userId, session.user.id),
      columns: {
        isAvailableForMentorship: true,
      },
    }),
    db.query.mentorshipPreferences.findFirst({
      where: eq(mentorshipPreferences.userId, session.user.id),
    }),
  ]);

  const initialValues = {
    isAvailable: profile?.isAvailableForMentorship ?? false,
    focusAreas: (preferences?.focusAreas?.filter((value): value is MentorshipFocusArea =>
      (MENTORSHIP_FOCUS_AREAS as readonly string[]).includes(value),
    ) ?? ["Technology"]) as MentorshipFocusArea[],
    maxMentees: (preferences?.maxMentees ?? 1) as 1 | 2 | 3,
    contactMethod: preferences?.contactMethod ?? "email",
    schedulingUrl: preferences?.schedulingUrl ?? "",
    mentorshipBio: preferences?.mentorshipBio ?? "",
  };

  return (
    <section>
      <PageHeader
        eyebrow="Mentorship"
        title="Become a Mentor"
        description="Set your availability and preferences so fellow alumni can request mentorship from you."
      />
      <BecomeMentorForm initialValues={initialValues} />
    </section>
  );
}
