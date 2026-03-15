import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { ProfileViewData } from "@/app/(portal)/profile/_components/types";

type MembershipCardProps = {
  profile: ProfileViewData;
};

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getMembershipStatus(membershipExpiresAt: string | null): {
  status: "Active" | "Expired";
  renewalDate: string;
} {
  if (!membershipExpiresAt) {
    return {
      status: "Active",
      renewalDate: "No renewal required",
    };
  }

  const renewalDate = new Date(membershipExpiresAt);
  if (Number.isNaN(renewalDate.getTime())) {
    return {
      status: "Active",
      renewalDate: "Unknown",
    };
  }

  return {
    status: renewalDate > new Date() ? "Active" : "Expired",
    renewalDate: renewalDate.toLocaleDateString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}

export function MembershipCard({ profile }: MembershipCardProps) {
  const membershipStatus = getMembershipStatus(profile.membershipExpiresAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership</CardTitle>
        <CardDescription>Your BICKOSA membership status and tier details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Tier</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-1)]">
              {toTitleCase(profile.membershipTier)}
            </p>
          </div>

          <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Status</p>
            <div className="mt-1">
              <Badge variant={membershipStatus.status === "Active" ? "success" : "warning"}>
                {membershipStatus.status}
              </Badge>
            </div>
          </div>

          <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Renewal Date</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-1)]">
              {membershipStatus.renewalDate}
            </p>
          </div>
        </div>

        <Button variant="gold">Upgrade to Lifetime Membership</Button>
      </CardContent>
    </Card>
  );
}
