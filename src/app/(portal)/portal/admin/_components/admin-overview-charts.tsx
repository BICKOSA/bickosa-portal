"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ChapterDistributionPoint, MonthlySeriesPoint } from "@/lib/admin-dashboard";

type AdminOverviewChartsProps = {
  membersJoinedSeries: MonthlySeriesPoint[];
  donationsByMonthSeries: MonthlySeriesPoint[];
  chapterDistribution: ChapterDistributionPoint[];
};

const membersChartConfig = {
  value: {
    label: "Members",
    color: "var(--navy-700)",
  },
} satisfies ChartConfig;

const donationsChartConfig = {
  value: {
    label: "Donations (UGX)",
    color: "var(--gold-500)",
  },
} satisfies ChartConfig;

const chaptersChartConfig = {
  members: {
    label: "Members",
    color: "var(--navy-700)",
  },
} satisfies ChartConfig;

function formatCompactValue(value: number): string {
  return new Intl.NumberFormat("en-UG", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function AdminOverviewCharts({
  membersJoinedSeries,
  donationsByMonthSeries,
  chapterDistribution,
}: AdminOverviewChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Members Joined (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={membersChartConfig} className="h-[280px] w-full">
            <LineChart data={membersJoinedSeries} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Donations by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={donationsChartConfig} className="h-[280px] w-full">
            <BarChart data={donationsByMonthSeries} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value) => formatCompactValue(Number(value))}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      `UGX ${Number(value).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`
                    }
                  />
                }
              />
              <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Member Distribution by Chapter</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chaptersChartConfig} className="h-[360px] w-full">
            <BarChart data={chapterDistribution} layout="vertical" margin={{ left: 24, right: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                dataKey="chapter"
                type="category"
                width={140}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="members" fill="var(--color-members)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
