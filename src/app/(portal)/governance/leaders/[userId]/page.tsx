import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { getLeaderProfile } from "@/lib/governance-leadership";

type PageProps = {
  params: Promise<{ userId: string }>;
};

function formatTerm(start: Date | null, end: Date | null): string {
  if (!start && !end) return "Term dates to be announced";
  if (start && end) return `${start.getFullYear()} - ${end.getFullYear()}`;
  if (start) return `Since ${start.getFullYear()}`;
  return `Until ${end?.getFullYear()}`;
}

export default async function GovernanceLeaderProfilePage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { userId } = await params;
  const profile = await getLeaderProfile(userId);
  if (!profile) {
    notFound();
  }

  const emailSubject = encodeURIComponent(`Message from BICKOSA member`);
  const emailBody = encodeURIComponent(
    `Hello ${profile.fullName},%0D%0A%0D%0AI would like to connect with you regarding BICKOSA governance.%0D%0A`,
  );

  return (
    <section className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start">
          <Avatar src={profile.avatarUrl} name={profile.fullName} size="xl" />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-(--text-1)">{profile.fullName}</h1>
            <p className="text-sm text-(--text-2)">{profile.position}</p>
            <p className="text-sm text-(--text-3)">{formatTerm(profile.termStart, profile.termEnd)}</p>
            <p className="text-sm text-(--text-2)">
              {profile.graduationYear ? `Class of ${profile.graduationYear}` : "BICKOSA Alumni"}
            </p>
            {profile.bio ? <p className="max-w-3xl text-sm text-(--text-2)">{profile.bio}</p> : null}
            <Button asChild variant="navy" size="sm">
              <Link href={`mailto:${profile.email}?subject=${emailSubject}&body=${emailBody}`}>Send Message</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past positions held</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile.pastPositions.length === 0 ? (
            <p className="text-sm text-(--text-3)">No published election history for this leader yet.</p>
          ) : (
            profile.pastPositions.map((item, index) => (
              <div key={`${item.cycleTitle}-${item.positionTitle}-${index}`} className="rounded-(--r-md) border border-border bg-(--surface) px-3 py-2">
                <p className="text-sm font-semibold text-(--text-1)">{item.positionTitle}</p>
                <p className="text-xs text-(--text-3)">
                  {item.cycleTitle} · {new Date(item.termStart).getFullYear()} - {new Date(item.termEnd).getFullYear()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
