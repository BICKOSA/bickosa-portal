import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

import type { ProfileViewData } from "@/app/(portal)/profile/_components/types";

type ProfileHeaderProps = {
  profile: ProfileViewData;
};

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const classOf = profile.yearOfCompletion ?? "----";

  return (
    <section className="rounded-[var(--r-xl)] bg-[var(--navy-900)] p-6 text-[var(--white)] shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar
            shape="rounded"
            size="xl"
            src={profile.avatarUrl}
            name={fullName}
            className="size-20 rounded-[14px] border-[color:rgba(255,255,255,0.24)] bg-[var(--navy-700)] text-[var(--white)]"
          />

          <div className="min-w-0">
            <h1 className="truncate font-[var(--font-ui)] text-2xl font-semibold text-[var(--white)]">
              {fullName}
            </h1>
            <p className="mt-1 text-sm text-[var(--navy-200)]">
              Class of {classOf} · BCK SSS Luzira
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--navy-200)]">
              {profile.bio?.trim() || "No bio yet. Share your journey and interests with fellow alumni."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                variant={profile.verificationStatus === "verified" ? "success" : "warning"}
                size="sm"
              >
                {toTitleCase(profile.verificationStatus)}
              </Badge>
              <Badge variant="secondary" size="sm">
                {profile.chapterName || "Unassigned Chapter"}
              </Badge>
              <Badge variant="outline" size="sm">
                {toTitleCase(profile.membershipTier)} Membership
              </Badge>
            </div>
          </div>
        </div>

        <Button asChild variant="outline-light" size="sm">
          <a href="#avatar-upload">Edit Photo</a>
        </Button>
      </div>
    </section>
  );
}
