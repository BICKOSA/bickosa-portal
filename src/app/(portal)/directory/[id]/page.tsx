import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Linkedin } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { getDirectoryProfileById, getViewerIsVerified } from "@/lib/directory";

type AlumniProfilePageProps = {
  params: Promise<{ id: string }>;
};

function formatLocation(city: string | null, country: string | null): string {
  if (city && country) {
    return `${city}, ${country}`;
  }
  return city ?? country ?? "Location not listed";
}

export default async function AlumniProfilePage({ params }: AlumniProfilePageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const viewerIsVerified = await getViewerIsVerified(session.user.id, Boolean(session.user.emailVerified));
  const profile = await getDirectoryProfileById({
    profileId: id,
    viewerIsVerified,
  });

  if (!profile) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              size="xl"
              src={profile.avatarUrl}
              name={profile.fullName}
              className="rounded-full border-[var(--border-2)]"
            />
            <div>
              <h2 className="font-[var(--font-ui)] text-2xl font-bold text-[var(--navy-900)]">
                {profile.fullName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="navy">Class {profile.classYear ?? "----"}</Badge>
                {profile.chapterName ? <Badge variant="outline">{profile.chapterName}</Badge> : null}
                {profile.industry ? <Badge variant="outline">{profile.industry}</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-[var(--text-3)]">
                {profile.currentJobTitle ?? "Role not listed"}
                {profile.currentEmployer ? ` at ${profile.currentEmployer}` : ""}
              </p>
            </div>
          </div>

          {profile.isAvailableForMentorship ? (
            <Button type="button" variant="gold">
              Request Mentorship
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[var(--text-2)]">
            <p>{profile.bio || "No bio shared yet."}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Location</p>
                <p className="mt-1">{formatLocation(profile.locationCity, profile.locationCountry)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Industry</p>
                <p className="mt-1">{profile.industry ?? "Not listed"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {profile.email ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Email</p>
                <a className="mt-1 inline-block text-[var(--navy-700)] hover:underline" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              </div>
            ) : null}

            {profile.phone ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Phone</p>
                <p className="mt-1 text-[var(--text-2)]">{profile.phone}</p>
              </div>
            ) : null}

            {profile.linkedinUrl ? (
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={profile.linkedinUrl} target="_blank" rel="noreferrer">
                  <Linkedin className="size-4" />
                  View LinkedIn
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-[var(--text-3)]">No public contact details shared.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
