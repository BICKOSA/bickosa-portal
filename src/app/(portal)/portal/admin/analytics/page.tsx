import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminAnalyticsData } from "@/lib/admin-analytics";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function FunnelCard(props: {
  title: string;
  description: string;
  steps: Array<{ label: string; value: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--text-2)]">{props.description}</p>
        <div className="space-y-2">
          {props.steps.map((step) => (
            <div key={step.label} className="flex items-center justify-between rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-2">
              <span className="text-sm text-[var(--text-2)]">{step.label}</span>
              <span className="text-sm font-semibold text-[var(--text-1)]">{step.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminAnalyticsPage() {
  await requireAdminPageSession();
  const analytics = await getAdminAnalyticsData();

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Analytics"
        description="Track funnel performance and north-star metrics across authentication, engagement, and giving."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Verified Members %</p>
            <p className="text-3xl font-semibold text-[var(--navy-900)]">
              {formatPercent(analytics.northStarKpis.verifiedMembersPercent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">MAM (30 days)</p>
            <p className="text-3xl font-semibold text-[var(--navy-900)]">
              {analytics.northStarKpis.mam.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Event Conversion Rate</p>
            <p className="text-3xl font-semibold text-[var(--navy-900)]">
              {formatPercent(analytics.northStarKpis.eventConversionRate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Fundraising Conversion Rate</p>
            <p className="text-3xl font-semibold text-[var(--navy-900)]">
              {formatPercent(analytics.northStarKpis.fundraisingConversionRate)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FunnelCard
          title="Members Funnel"
          description="Registered to fully verified member progression."
          steps={analytics.membersFunnel}
        />
        <FunnelCard
          title="Event Conversion"
          description="Event discovery to RSVP and estimated attendance over 30 days."
          steps={analytics.eventConversionFunnel}
        />
        <FunnelCard
          title="Donation Funnel"
          description="Donation journey from opening the modal to completed payment."
          steps={analytics.donationFunnel}
        />
      </div>
    </section>
  );
}
