import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PortalDashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Alumni Dashboard"
        description="Overview of chapter activity, events, and contributions."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="border-none pb-1">
            <CardDescription>Total members</CardDescription>
            <CardTitle className="text-2xl">3,847</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-[var(--text-3)]">
            +42 in the last 30 days
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-none pb-1">
            <CardDescription>Event RSVPs (month)</CardDescription>
            <CardTitle className="text-2xl">612</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-[var(--text-3)]">
            4 active events this month
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-none pb-1">
            <CardDescription>Mentorship matches</CardDescription>
            <CardTitle className="text-2xl">128</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-[var(--text-3)]">
            19 new this quarter
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-none pb-1">
            <CardDescription>Giving campaigns</CardDescription>
            <CardTitle className="text-2xl">7</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-[var(--text-3)]">
            2 campaigns currently featured
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest community updates across the portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-2">
                Class of 2012 cohort meetup reached 120 RSVPs.
              </div>
              <div className="rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-2">
                14 new alumni profiles verified this week.
              </div>
              <div className="rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-2">
                Mentorship applications opened for STEM careers.
              </div>
              <div className="rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-2">
                Scholarship fundraising campaign reached 68% of target.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Common tasks for active members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-[var(--r-md)] border border-[var(--border)] px-3 py-2">
              Complete profile and privacy preferences
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--border)] px-3 py-2">
              RSVP to upcoming reunion events
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--border)] px-3 py-2">
              Request or offer mentorship support
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--border)] px-3 py-2">
              Contribute to active giving campaigns
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
