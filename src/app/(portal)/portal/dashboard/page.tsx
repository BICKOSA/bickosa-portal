import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Handshake,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Vote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import {
  getMonthlyHighlights,
  getPersonalDashboardData,
  getPortalDashboardData,
  type DashboardActionItem,
  type MonthlyElectionMilestone,
  type MonthlyEvent,
  type MonthlyHighlights,
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

function actionIcon(kind: DashboardActionItem["kind"]): ReactNode {
  switch (kind) {
    case "verification":
      return <ShieldCheck className="size-4 text-(--navy-500)" />;
    case "profile":
      return <Sparkles className="size-4 text-(--gold-500)" />;
    case "election_vote":
    case "election_nominate":
    case "poll":
      return <Vote className="size-4 text-(--navy-700)" />;
    case "mentorship_request":
      return <Handshake className="size-4 text-(--navy-500)" />;
    case "event_rsvp":
      return <CalendarCheck2 className="size-4 text-(--navy-500)" />;
    default:
      return <CheckCircle2 className="size-4 text-(--text-3)" />;
  }
}

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const sessionFirstName = (session.user.name ?? "").split(/\s+/)[0] || null;

  const [data, personal, monthly] = await Promise.all([
    getPortalDashboardData(),
    getPersonalDashboardData(userId),
    getMonthlyHighlights(),
  ]);

  const displayName = personal.profile.firstName ?? sessionFirstName ?? "there";
  const now = new Date();
  const actionItems = personal.actionItems;
  const completeness = personal.profile.completenessPercent;
  const verificationStatus = personal.profile.verificationStatus;

  return (
    <div className="flex flex-col gap-6">
      {/* Personal hero */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-(--text-3)">{greeting(now)},</p>
            <h1 className="font-[family-name:var(--font-ui)] text-2xl font-semibold text-(--navy-900) sm:text-3xl">
              {displayName}.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {verificationStatus === "verified" ? (
              <Badge className="bg-(--success)/10 text-(--success)" variant="outline">
                <CheckCircle2 className="size-3" /> Verified
              </Badge>
            ) : verificationStatus === "rejected" ? (
              <Badge className="bg-(--error)/10 text-(--error)" variant="outline">
                <AlertTriangle className="size-3" /> Verification rejected
              </Badge>
            ) : (
              <Badge variant="outline">
                <ShieldCheck className="size-3" /> Verification pending
              </Badge>
            )}
          </div>
        </div>

        {completeness < 100 ? (
          <ProfileCompletionStrip
            percent={completeness}
            missing={personal.profile.missingFields}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-(--gold-500)" /> Your action items
              </CardTitle>
              <CardDescription>
                Personal tasks across voting, mentorship, and events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionItems.length > 0 ? (
                <ul className="space-y-2">
                  {actionItems.map((item) => (
                    <ActionItemRow key={item.id} item={item} />
                  ))}
                </ul>
              ) : (
                <div className="rounded-(--r-md) bg-(--surface) px-4 py-6 text-center text-sm text-(--text-3)">
                  Nothing on your plate right now. Explore the directory or
                  upcoming events to stay connected.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump to common tasks.</CardDescription>
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
      </section>

      {/* What's happening this month */}
      <MonthlyHighlightsSection highlights={monthly} />

      {/* Community vitals */}
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-ui)] text-base font-semibold text-(--navy-900)">
            Community vitals
          </h2>
          <p className="text-xs text-(--text-3)">
            Click any card for the underlying view
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <StatCard
            href="/directory"
            description="Total Members"
            value={data.totalMembers.value.toLocaleString()}
            badge={
              <ComparisonBadge value={data.totalMembers.comparisonPercent} />
            }
            footer={`${data.totalMembers.newThisMonth.toLocaleString()} new this month`}
            sub={`Across ${data.totalMembers.activeChapters.toLocaleString()} active chapters`}
            footerIcon={<TrendingUp className="size-4" />}
          />

          <StatCard
            href="/events"
            description="Event RSVPs (month)"
            value={data.eventRsvps.value.toLocaleString()}
            badge={
              <ComparisonBadge value={data.eventRsvps.comparisonPercent} />
            }
            footer={
              data.eventRsvps.value > 0
                ? "Active event participation"
                : "No RSVPs recorded this month"
            }
            sub={`${data.eventRsvps.activeEventsThisMonth} active events this month`}
            footerIcon={<CalendarCheck2 className="size-4" />}
          />

          <StatCard
            href="/mentorship"
            description="Mentorship Matches"
            value={data.mentorshipMatches.value.toLocaleString()}
            badge={
              <ComparisonBadge
                value={data.mentorshipMatches.comparisonPercent}
              />
            }
            footer={`${data.mentorshipMatches.newThisQuarter.toLocaleString()} new this quarter`}
            sub="Accepted mentorship pairings"
            footerIcon={<Handshake className="size-4" />}
          />

          <StatCard
            href="/donate"
            description="Giving Campaigns"
            value={data.givingCampaigns.value.toLocaleString()}
            badge={
              <Badge variant="outline">
                {data.givingCampaigns.featuredCampaigns} featured
              </Badge>
            }
            footer={`${data.givingCampaigns.featuredCampaigns.toLocaleString()} campaigns featured`}
            sub={
              data.givingCampaigns.topCampaignTitle &&
              data.givingCampaigns.topCampaignProgressPercent !== null
                ? `${data.givingCampaigns.topCampaignTitle} at ${data.givingCampaigns.topCampaignProgressPercent}% target`
                : "No published campaign progress yet"
            }
            footerIcon={<HeartHandshake className="size-4" />}
          />
        </div>
      </section>

      {/* Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
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
    </div>
  );
}

function ProfileCompletionStrip({
  percent,
  missing,
}: {
  percent: number;
  missing: string[];
}) {
  const preview = missing.slice(0, 3).join(", ");
  const overflow = missing.length > 3 ? `, +${missing.length - 3} more` : "";
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-(--r-lg) border border-(--border) bg-(--white) px-4 py-3 shadow-(--shadow-sm)">
      <div className="min-w-[160px] flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-(--navy-900)">
            Profile {percent}% complete
          </span>
          <span className="text-xs text-(--text-3)">
            {missing.length} item{missing.length === 1 ? "" : "s"} left
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--navy-50)">
          <div
            className="h-full rounded-full bg-(--gold-500) transition-[width]"
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
        {missing.length > 0 ? (
          <p className="mt-2 text-xs text-(--text-3)">
            Still to add: {preview}
            {overflow}
          </p>
        ) : null}
      </div>
      <Button asChild variant="navy" size="sm">
        <Link href="/profile">
          Finish profile <ArrowRight className="size-3" />
        </Link>
      </Button>
    </div>
  );
}

function ActionItemRow({ item }: { item: DashboardActionItem }) {
  return (
    <li>
      <Link
        href={item.href}
        className="group flex items-start gap-3 rounded-(--r-md) border border-(--border) bg-(--white) px-3 py-3 transition hover:border-(--navy-200) hover:bg-(--navy-50)"
      >
        <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-(--navy-50)">
          {actionIcon(item.kind)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-(--navy-900)">{item.title}</p>
            {item.urgent ? (
              <Badge
                variant="outline"
                className="border-(--error)/30 bg-(--error)/10 text-(--error)"
              >
                Urgent
              </Badge>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-0.5 text-xs text-(--text-3)">{item.description}</p>
          ) : null}
          {item.dueAt ? (
            <p className="mt-1 text-xs text-(--text-4)">
              Closes {formatRelativeTime(item.dueAt)}
            </p>
          ) : null}
        </div>
        <span className="self-center text-(--text-4) transition group-hover:translate-x-0.5 group-hover:text-(--navy-700)">
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

function StatCard({
  href,
  description,
  value,
  badge,
  footer,
  sub,
  footerIcon,
}: {
  href: string;
  description: string;
  value: string;
  badge: ReactNode;
  footer: string;
  sub: string;
  footerIcon: ReactNode;
}) {
  return (
    <Link href={href} className="block">
      <Card className="from-primary/5 to-card @container/card bg-linear-to-t transition hover:shadow-md">
        <CardHeader className="border-none pb-1">
          <CardDescription>{description}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {value}
          </CardTitle>
          <CardAction>{badge}</CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-none pt-0 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {footer} {footerIcon}
          </div>
          <div className="text-(--text-3)">{sub}</div>
        </CardFooter>
      </Card>
    </Link>
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

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Kampala",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Kampala",
  hour: "numeric",
  minute: "2-digit",
});

function formatEventDate(value: Date): string {
  return `${DATE_FORMATTER.format(value)} · ${TIME_FORMATTER.format(value)}`;
}

function eventLocation(ev: MonthlyEvent): string {
  if (ev.isOnline) return "Online";
  if (ev.locationName && ev.locationCity)
    return `${ev.locationName}, ${ev.locationCity}`;
  return ev.locationName ?? ev.locationCity ?? "Location to be confirmed";
}

function milestoneLabel(type: MonthlyElectionMilestone["type"]): string {
  if (type === "nominations_close") return "Nominations close";
  if (type === "voting_opens") return "Voting opens";
  return "Voting closes";
}

function formatCurrency(amount: bigint): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) {
    return `UGX ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `UGX ${(value / 1_000).toFixed(0)}K`;
  }
  return `UGX ${value.toLocaleString()}`;
}

function MonthlyHighlightsSection({
  highlights,
}: {
  highlights: MonthlyHighlights;
}) {
  const isEmpty =
    highlights.events.length === 0 &&
    highlights.electionMilestones.length === 0 &&
    highlights.campaigns.length === 0;

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-ui)] text-base font-semibold text-(--navy-900)">
            What&apos;s happening this month
          </h2>
          <p className="text-xs text-(--text-3)">
            Events, deadlines, and campaigns in {highlights.monthLabel}.
          </p>
        </div>
      </header>

      {isEmpty ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-(--text-3)">
            Nothing scheduled for {highlights.monthLabel} just yet — check back
            soon.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className={highlights.events.length === 0 ? "" : "lg:col-span-2"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck2 className="size-4 text-(--navy-500)" /> Events
              </CardTitle>
              <CardDescription>
                Coming up across the community.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {highlights.events.length > 0 ? (
                highlights.events.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.slug}`}
                    className="flex items-start gap-3 rounded-(--r-md) border border-(--border) bg-(--white) px-3 py-2.5 transition hover:border-(--navy-200) hover:bg-(--navy-50)"
                  >
                    <span className="mt-0.5 inline-flex size-9 shrink-0 flex-col items-center justify-center rounded-(--r-md) bg-(--navy-50) text-(--navy-700)">
                      <span className="text-[10px] leading-none uppercase">
                        {ev.startAt.toLocaleString("en-US", { timeZone: "Africa/Kampala", month: "short" })}
                      </span>
                      <span className="text-sm font-semibold leading-none">
                        {ev.startAt.getDate()}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-(--navy-900)">
                        {ev.title}
                      </p>
                      <p className="mt-0.5 text-xs text-(--text-3)">
                        {formatEventDate(ev.startAt)} · {eventLocation(ev)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-(--r-md) bg-(--surface) px-3 py-3 text-sm text-(--text-3)">
                  No published events this month yet.
                </p>
              )}
              {highlights.events.length > 0 ? (
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-(--navy-700) hover:underline"
                >
                  See all events <ArrowRight className="size-3" />
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {highlights.electionMilestones.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Vote className="size-4 text-(--navy-700)" /> Election dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {highlights.electionMilestones.map((milestone) => (
                    <Link
                      key={milestone.id}
                      href={
                        milestone.type === "nominations_close"
                          ? "/voting"
                          : `/voting/elections/${milestone.cycleId}`
                      }
                      className="flex items-start gap-3 rounded-(--r-md) bg-(--surface) px-3 py-2 transition hover:bg-(--navy-50)"
                    >
                      <span className="mt-0.5 inline-flex size-8 shrink-0 flex-col items-center justify-center rounded-(--r-md) bg-(--white) text-(--navy-700)">
                        <span className="text-sm font-semibold leading-none">
                          {milestone.at.getDate()}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-(--navy-900)">
                          {milestoneLabel(milestone.type)}
                        </p>
                        <p className="truncate text-xs text-(--text-3)">
                          {milestone.cycleTitle}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-(--text-3)">
                        {TIME_FORMATTER.format(milestone.at)}
                      </p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {highlights.campaigns.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeartHandshake className="size-4 text-(--gold-500)" /> Giving
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {highlights.campaigns.map((campaign) => (
                    <Link
                      key={campaign.id}
                      href={`/donate/${campaign.slug}`}
                      className="block rounded-(--r-md) bg-(--surface) px-3 py-2 transition hover:bg-(--navy-50)"
                    >
                      <p className="truncate text-sm font-medium text-(--navy-900)">
                        {campaign.title}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-(--white)">
                        <div
                          className="h-full rounded-full bg-(--gold-500)"
                          style={{
                            width: `${Math.max(2, campaign.progressPercent ?? 0)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-(--text-3)">
                        {formatCurrency(campaign.raisedAmount)} raised of{" "}
                        {formatCurrency(campaign.goalAmount)}
                        {campaign.progressPercent !== null
                          ? ` · ${campaign.progressPercent}%`
                          : ""}
                      </p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </section>
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
