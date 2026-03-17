import Link from "next/link";
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

export default function PortalDashboardPage() {
  return (
    <>
      {/* Section cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card bg-linear-to-t from-primary/5 to-card">
          <CardHeader className="border-none pb-1">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              3,847
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                +1.1%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 border-none pt-0 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              42 new this month <TrendingUp className="size-4" />
            </div>
            <div className="text-(--text-3)">
              Across 12 worldwide chapters
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card bg-linear-to-t from-primary/5 to-card">
          <CardHeader className="border-none pb-1">
            <CardDescription>Event RSVPs (month)</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              612
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                +8.2%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 border-none pt-0 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Strong event participation <TrendingUp className="size-4" />
            </div>
            <div className="text-(--text-3)">
              4 active events this month
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card bg-linear-to-t from-primary/5 to-card">
          <CardHeader className="border-none pb-1">
            <CardDescription>Mentorship Matches</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              128
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                +17.4%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 border-none pt-0 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              19 new this quarter <TrendingUp className="size-4" />
            </div>
            <div className="text-(--text-3)">
              STEM careers leading demand
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card bg-linear-to-t from-primary/5 to-card">
          <CardHeader className="border-none pb-1">
            <CardDescription>Giving Campaigns</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              7
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingDown className="size-3" />
                -12%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 border-none pt-0 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              2 campaigns featured <TrendingDown className="size-4" />
            </div>
            <div className="text-(--text-3)">
              Scholarship fund at 68% target
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Content panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest community updates across the portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <ActivityItem
                icon={<CalendarCheck2 className="size-4 text-(--navy-500)" />}
                text="Class of 2012 cohort meetup reached 120 RSVPs."
                time="2 hours ago"
              />
              <ActivityItem
                icon={<Users className="size-4 text-(--success)" />}
                text="14 new alumni profiles verified this week."
                time="5 hours ago"
              />
              <ActivityItem
                icon={<Handshake className="size-4 text-(--navy-500)" />}
                text="Mentorship applications opened for STEM careers."
                time="1 day ago"
              />
              <ActivityItem
                icon={<HeartHandshake className="size-4 text-(--gold-500)" />}
                text="Scholarship fundraising campaign reached 68% of target."
                time="2 days ago"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for active members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction href="/profile" label="Complete profile and privacy preferences" />
            <QuickAction href="/events" label="RSVP to upcoming reunion events" />
            <QuickAction href="/mentorship" label="Request or offer mentorship support" />
            <QuickAction href="/donate" label="Contribute to active giving campaigns" />
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
  icon: React.ReactNode;
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
      className="flex items-center gap-2 rounded-(--r-md) border border-border px-3 py-2.5 text-sm text-(--text-1) transition-colors hover:bg-(--surface)"
    >
      <span className="flex-1">{label}</span>
      <span className="text-(--text-4)" aria-hidden>&rarr;</span>
    </Link>
  );
}
