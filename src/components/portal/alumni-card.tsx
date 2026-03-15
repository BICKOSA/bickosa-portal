"use client";

import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DirectoryAlumnus } from "@/lib/directory";

type AlumniCardProps = {
  alumnus: DirectoryAlumnus;
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

function formatLocation(alumnus: DirectoryAlumnus): string {
  if (alumnus.locationCity && alumnus.locationCountry) {
    return `${alumnus.locationCity}, ${alumnus.locationCountry}`;
  }
  return alumnus.locationCity ?? alumnus.locationCountry ?? "Location not listed";
}

export function AlumniCard({ alumnus }: AlumniCardProps) {
  const initialsBackground = hashNameToHsl(alumnus.fullName);

  return (
    <article className="group rounded-xl border border-border bg-[var(--white)] p-4 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start gap-3">
        <Avatar
          size="lg"
          src={alumnus.avatarUrl}
          name={alumnus.fullName}
          className="size-[60px] border-[var(--border-2)]"
          style={!alumnus.avatarUrl ? { backgroundColor: initialsBackground } : undefined}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate [font-family:var(--font-ui)] text-base font-semibold text-[var(--navy-900)]">
            {alumnus.fullName}
          </h3>
          <p className="mt-1 line-clamp-1 text-sm text-[var(--text-2)]">
            {alumnus.currentJobTitle ?? "Role not listed"}
            {alumnus.currentEmployer ? ` at ${alumnus.currentEmployer}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="navy">Class {alumnus.classYear ?? "----"}</Badge>
            {alumnus.chapterName ? (
              <Badge variant="outline" className="max-w-[140px] truncate">
                {alumnus.chapterName}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-[var(--text-3)]">{formatLocation(alumnus)}</p>

      <div className="mt-4 flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1">
          Message
        </Button>
        <Button asChild variant="ghost" size="sm" className="flex-1">
          <Link href={`/portal/directory/${alumnus.id}`}>View Profile</Link>
        </Button>
      </div>
    </article>
  );
}
