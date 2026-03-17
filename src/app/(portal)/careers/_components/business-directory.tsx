import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { BusinessDirectoryItem } from "@/lib/careers";

type BusinessDirectoryProps = {
  items: BusinessDirectoryItem[];
};

export function BusinessDirectory({ items }: BusinessDirectoryProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-5">
          <p className="text-sm text-[var(--text-2)]">
            No alumni businesses found for this filter yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-2 py-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">{item.name}</p>
              <p className="text-xs text-[var(--text-3)]">
                {item.role ?? "Role not listed"}
                {item.company ? ` · ${item.company}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{item.industry}</Badge>
              {item.isAvailableForMentorship ? <Badge variant="success">Open to mentor</Badge> : null}
            </div>

            {item.websiteUrl ? (
              <Link
                href={item.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-[var(--navy-700)] hover:underline"
              >
                Visit website
              </Link>
            ) : (
              <p className="text-xs text-[var(--text-3)]">Website not public</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
