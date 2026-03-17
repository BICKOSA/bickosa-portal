import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type LeaderCardProps = {
  alumniProfileId: string;
  fullName: string;
  role: string;
  classYear: number;
  avatarUrl: string | null;
};

export function LeaderCard({
  alumniProfileId,
  fullName,
  role,
  classYear,
  avatarUrl,
}: LeaderCardProps) {
  return (
    <article className="rounded-(--r-xl) border border-border bg-(--white) p-4 shadow-(--shadow-sm)">
      <div className="flex items-center gap-3">
        <Avatar src={avatarUrl} name={fullName} className="size-11" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-(--navy-900)">{fullName}</h3>
          <p className="text-xs text-(--text-2)">{role}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge variant="outline">Class of {classYear}</Badge>
        <Link href={`/directory/${alumniProfileId}`} className="text-xs text-(--navy-700) hover:underline">
          View profile
        </Link>
      </div>
    </article>
  );
}
