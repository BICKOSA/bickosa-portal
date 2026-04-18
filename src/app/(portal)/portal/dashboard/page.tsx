import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarCheck2,
  Handshake,
  HeartHandshake,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPortalDashboardData,
  type PortalDashboardActivity,
} from "@/lib/portal-dashboard";

function formatSignedPercent(value: number | null): string {
  if (value === null) return "New";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function coerceDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function activityTimeKey(value: Date | string): string {
  return coerceDate(value)?.toISOString() ?? String(value);
}

function formatRelativeTime(value: Date | string): string {
  const date = coerceDate(value);
  if (!date) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const absoluteDiffMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absoluteDiffMs < hour) {
    const minutes = Math.max(1, Math.round(absoluteDiffMs / minute));
    return diffMs >= 0 ? `${minutes} min ago` : `in ${minutes} min`;
  }
  if (absoluteDiffMs < day) {
    const hours = Math.round(absoluteDiffMs / hour);
    return diffMs >= 0 ? `${hours} hours ago` : `in ${hours} hours`;
  }

  const days = Math.round(absoluteDiffMs / day);
  return diffMs >= 0 ? `${days} days ago` : `in ${days} days`;
}

function activityIcon(type: PortalDashboardActivity["type"]): ReactNode {
  if (type === "event")
    return <CalendarCheck2 className="size-4 text-(--navy-500)" />;
  if (type === "members") return <Users className="size-4 text-(--success)" />;
  if (type === "mentorship")
    return <Handshake className="size-4 text-(--navy-500)" />;
  return <HeartHandshake className="size-4 text-(--gold-500)" />;
}

function ComparisonBadge({ value }: { value: number | null }) {
  const isDown = value !== null && value < 0;
  const Icon = isDown ? TrendingDown : TrendingUp;

  return (
    <Badge variant="outline">
      <Icon className="size-3" />
      {formatSignedPercent(value)}
    </Badge>
  );
}

export default async function PortalDashboardPage() {
  const data = await getPortalDashboardData();

  return (
    <>
      {/* Section cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="from-primary/5 to-card @container/card bg-linear-to-t">
          <CardHeader className="border-none pb-1">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.totalMembers.value.toLocaleString()}
            </CardTitle>
            <CardAction>
              <ComparisonBadge value={data.totalMembers.comparisonPercent} />
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 border-none pt-0 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {data.totalMembers.newThisMonth.toLocaleString()} new this month{" "}
              <TrendingUp className="size-4" />
            </div>
            <div className="text-(--text-3)">
              Across {data.totalMembers.activeChapters.toLocaleString()} active
              chapters
            </div>
          </CardFooter>
        </Card>

        <Card className="from-primary/5 to-card @container/card bg-linear-to-t">
          <CardHeader className="border-none pb-1">
            <CardDescription>Event RSVPs (month)</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.eventRsvps.value.toLocaleString()}
            </CardTitle>
            <CardAction>
              <ComparisonBadge value={data.eventRsvps.comparisonPercent} />
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 border-none pt-0 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {data.eventRsvps.value > 0
                ? "Active event participation"
                : "No RSVPs recorded this month"}{" "}
              <TrendingUp className="size-4" />
            </div>
            <div className="text-(--text-3)">
              {data.eventRsvps.activeEventsThisMonth} active events this month
            </div>
          </CardFooter>
        </Card>

        <Card className="from-primary/5 to-card @container/card bg-linear-to-t">
          <CardHeader className="border-none pb-1">
            <CardDescription>Mentorship Matches</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.mentorshipMatches.value.toLocaleString()}
            </CardTitle>
            <CardAction>
              <ComparisonBadge
                value={data.mentorshipMatches.comparisonPercent}
              />
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 border-none pt-0 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {data.mentorshipMatches.newThisQuarter.toLocaleString()} new this
              quarter <TrendingUp className="size-4" />
            </div>
            <div className="text-(--text-3)">Accepted mentorship pairings</div>
          </CardFooter>
        </Card>

        <Card className="from-primary/5 to-card @container/card bg-linear-to-t">
          <CardHeader className="border-none pb-1">
            <CardDescription>Giving Campaigns</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.givingCampaigns.value.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                {data.givingCampaigns.featuredCampaigns} featured
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 border-none pt-0 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {data.givingCampaigns.featuredCampaigns.toLocaleString()}{" "}
              campaigns featured <HeartHandshake className="size-4" />
            </div>
            <div className="text-(--text-3)">
              {data.givingCampaigns.topCampaignTitle &&
              data.givingCampaigns.topCampaignProgressPercent !== null
                ? `${data.givingCampaigns.topCampaignTitle} at ${data.givingCampaigns.topCampaignProgressPercent}% target`
                : "No published campaign progress yet"}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Content panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest community updates across the portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {data.recentActivity.length > 0 ? (
                data.recentActivity.map((item) => (
                  <ActivityItem
                    key={`${item.type}:${activityTimeKey(item.time)}:${item.text}`}
                    icon={activityIcon(item.type)}
                    text={item.text}
                    time={formatRelativeTime(item.time)}
                  />
                ))
              ) : (
                <p className="rounded-(--r-md) bg-(--surface) px-3 py-4 text-(--text-3)">
                  No recent community activity has been recorded yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for active members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction
              href="/profile"
              label="Complete profile and privacy preferences"
            />
            <QuickAction
              href="/events"
              label="RSVP to upcoming reunion events"
            />
            <QuickAction
              href="/mentorship"
              label="Request or offer mentorship support"
            />
            <QuickAction
              href="/donate"
              label="Contribute to active giving campaigns"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ActivityItem({
  icon,
  text,
  time,
}: {
  icon: ReactNode;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-(--r-md) bg-(--surface) px-3 py-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-(--text-1)">{text}</p>
        <p className="mt-0.5 text-xs text-(--text-3)">{time}</p>
      </div>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="border-border flex items-center gap-2 rounded-(--r-md) border px-3 py-2.5 text-sm text-(--text-1) transition-colors hover:bg-(--surface)"
    >
      <span className="flex-1">{label}</span>
      <span className="text-(--text-4)" aria-hidden>
        &rarr;
      </span>
    </Link>
  );
}
