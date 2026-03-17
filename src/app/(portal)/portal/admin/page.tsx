import Link from "next/link";

import { AdminOverviewCharts } from "@/app/(portal)/portal/admin/_components/admin-overview-charts";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminOverviewData } from "@/lib/admin-dashboard";

function formatCurrency(value: number): string {
  return `UGX ${value.toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
}

export default async function PortalAdminIndexPage() {
  await requireAdminPageSession();
  const data = await getAdminOverviewData();
  const stats = data.stats;

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Admin Dashboard"
        description="Monitor member verification, engagement trends, and platform activity from one control center."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Registered Members</p>
            <p className="text-3xl font-semibold text-[var(--navy-900)]">
              {stats.totalRegisteredMembers.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-3)]">
              {stats.newRegistrationsThisMonth.toLocaleString()} joined this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Verification Queue</p>
            <p className="text-3xl font-semibold text-[var(--navy-900)]">
              {stats.pendingVerification.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="success">{stats.verifiedMembers.toLocaleString()} verified</Badge>
              <Badge variant="warning">{stats.pendingVerification.toLocaleString()} pending</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Donations Raised</p>
            <p className="text-3xl font-semibold text-[var(--navy-900)]">{formatCurrency(stats.totalDonationsRaised)}</p>
            <p className="text-xs text-[var(--text-3)]">
              {stats.activeCampaigns} active campaigns · {stats.eventsThisMonth} events this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Community Operations</p>
            <p className="text-3xl font-semibold text-[var(--navy-900)]">
              {stats.activeMentorshipPairings.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-3)]">
              Active mentorship pairings · {stats.pendingJobPostings} jobs pending review
            </p>
          </CardContent>
        </Card>
      </div>

      <AdminOverviewCharts
        membersJoinedSeries={data.membersJoinedSeries}
        donationsByMonthSeries={data.donationsByMonthSeries}
        chapterDistribution={data.chapterDistribution}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="navy-tint" accentBar>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">
                {stats.pendingVerification.toLocaleString()} members pending verification
              </p>
              <p className="text-xs text-[var(--text-3)]">
                Review identity and graduation details to keep the directory trusted.
              </p>
            </div>
            <Button asChild variant="navy" size="sm">
              <Link href="/admin/members?status=pending">Review Members</Link>
            </Button>
          </CardContent>
        </Card>

        <Card variant="gold-tint" accentBar>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">
                {stats.pendingJobPostings.toLocaleString()} job postings pending review
              </p>
              <p className="text-xs text-[var(--text-3)]">
                Approve high-quality roles before they appear in the careers hub.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/careers">Open Careers Queue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
