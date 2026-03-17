"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { NotificationPanel } from "@/components/layout/notification-panel";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type TopbarUser = {
  id: string;
  name?: string | null;
  image?: string | null;
};

const titleMatchers: Array<{ match: string; title: string }> = [
  { match: "/dashboard", title: "Dashboard" },
  { match: "/directory", title: "Alumni Directory" },
  { match: "/mentorship", title: "Mentorship" },
  { match: "/events", title: "Events & RSVPs" },
  { match: "/careers", title: "Careers" },
  { match: "/sports", title: "Sports League" },
  { match: "/donate", title: "Donate" },
  { match: "/profile", title: "My Profile" },
  { match: "/settings", title: "Settings" },
  { match: "/governance", title: "Governance & Docs" },
  { match: "/admin/members", title: "Admin Members" },
  { match: "/admin/careers", title: "Admin Careers" },
  { match: "/admin/analytics", title: "Admin Analytics" },
  { match: "/admin/dashboard", title: "Admin Dashboard" },
  { match: "/admin", title: "Admin" },
];

function getPageTitle(pathname: string): string {
  const matched = titleMatchers.find((entry) => pathname === entry.match || pathname.startsWith(`${entry.match}/`));
  return matched?.title ?? "Alumni Portal";
}

export function Topbar({ user }: { user: TopbarUser }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 rounded-t-xl border-b border-border bg-(--white) transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="min-w-0 truncate text-base font-semibold text-(--navy-900)" style={{ fontFamily: "var(--font-ui)" }}>
          {pageTitle}
        </h1>

        <div className="mx-auto hidden max-w-xl flex-1 lg:flex">
          <label className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--text-3)" />
            <input
              type="search"
              placeholder="Search portal (coming soon)"
              readOnly
              className="h-10 w-full rounded-full border border-border bg-(--surface) pl-9 pr-4 text-sm text-(--text-2) outline-none"
            />
          </label>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <NotificationPanel />

          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full border border-(--navy-900) bg-(--navy-900) text-(--white) transition-colors hover:bg-(--navy-700)"
            aria-label="Quick action"
          >
            <Plus className="size-4" />
          </button>

          <Link
            href="/profile"
            aria-label="My profile"
            className="inline-flex rounded-full ring-offset-2 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--navy-400)"
          >
            <Avatar
              size="sm"
              src={user.image}
              name={user.name ?? "BICKOSA Member"}
              className="border-(--border-2) bg-(--navy-50)"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
