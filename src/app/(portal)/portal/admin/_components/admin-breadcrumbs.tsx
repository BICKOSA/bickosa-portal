"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const segmentLabelMap: Record<string, string> = {
  admin: "Admin",
  members: "Members",
  careers: "Careers",
  donations: "Donations",
  events: "Events",
  campaigns: "Campaigns",
  registrations: "Registrations",
  "school-records": "School Records",
  outreach: "Outreach",
  cohorts: "Cohorts",
  governance: "Governance",
  documents: "Documents",
  dashboard: "Dashboard",
  sports: "Sports",
};

function toLabel(segment: string): string {
  return (
    segmentLabelMap[segment] ??
    segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] !== "admin") {
    return null;
  }

  const items = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const isLast = index === segments.length - 1;
    return {
      label: toLabel(segment),
      href,
      isLast,
    };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <BreadcrumbItem key={item.href}>
            {item.isLast ? (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link href={item.href} />}>
                {item.label}
              </BreadcrumbLink>
            )}
            {index < items.length - 1 ? <BreadcrumbSeparator /> : null}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
