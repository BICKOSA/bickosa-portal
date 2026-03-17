import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MentorCardProps = {
  mentorId: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  classYear: number | null;
  focusAreas: string[];
  pendingRequestCount: number;
  hasPendingRequestFromViewer: boolean;
  showRequestButton?: boolean;
};

function hashNameToHsl(name: string): string {
  let hash = 0;
  for (const char of name) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 92%)`;
}

export function MentorCard({
  mentorId,
  fullName,
  avatarUrl,
  jobTitle,
  classYear,
  focusAreas,
  pendingRequestCount,
  hasPendingRequestFromViewer,
  showRequestButton = true,
}: MentorCardProps) {
  const initialsBackground = hashNameToHsl(fullName);
  const isFullyBooked = pendingRequestCount >= 3;
  const requestDisabled = isFullyBooked || hasPendingRequestFromViewer;

  return (
    <article className="rounded-(--r-xl) border border-border bg-(--white) p-4 shadow-(--shadow-sm)">
      <header className="flex items-start gap-3">
        <Avatar
          src={avatarUrl}
          name={fullName}
          className="size-11 border border-(--border-2)"
          style={!avatarUrl ? { backgroundColor: initialsBackground } : undefined}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-(--navy-900)">
            {fullName}
          </h3>
          <p className="mt-1 line-clamp-1 text-sm text-(--text-2)">
            {jobTitle ?? "Role not listed"}
          </p>
          <p className="mt-1 text-xs font-semibold text-(--gold-800)">
            Class of {classYear ?? "----"}
          </p>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-2">
        {(focusAreas.length ? focusAreas : ["General"]).map((focusArea) => (
          <Badge key={focusArea} variant="navy">
            {focusArea}
          </Badge>
        ))}
      </div>

      <div className="mt-4">
        <Badge variant={isFullyBooked ? "warning" : "success"}>
          {isFullyBooked ? "Fully booked" : "Available"}
        </Badge>
      </div>

      {showRequestButton ? (
        <div className="mt-4">
          {requestDisabled ? (
            <Button type="button" variant="outline" className="w-full" disabled>
              Request Mentorship
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link href={`/mentorship/${mentorId}/request`}>Request Mentorship</Link>
            </Button>
          )}
        </div>
      ) : null}
    </article>
  );
}
