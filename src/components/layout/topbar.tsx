"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Plus, Search } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
  { match: "/admin/careers", title: "Admin Careers" },
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
  const hasUnreadNotifications = true;

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center gap-4 border-b border-[var(--border)] bg-[var(--white)] px-4 sm:px-6 lg:px-8">
      <h1 className="min-w-0 truncate font-[var(--font-ui)] text-[1.05rem] font-bold text-[var(--navy-900)]">
        {pageTitle}
      </h1>

      <div className="mx-auto hidden max-w-xl flex-1 md:flex">
        <label className="relative w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            type="search"
            placeholder="Search portal (coming soon)"
            readOnly
            className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] pl-9 pr-4 text-sm text-[var(--text-2)] outline-none"
          />
        </label>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-2)] transition-colors hover:bg-[var(--navy-50)] hover:text-[var(--navy-700)]"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {hasUnreadNotifications ? (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--gold-500)]" />
          ) : null}
        </button>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--navy-900)] bg-[var(--navy-900)] text-[var(--white)] transition-colors hover:bg-[var(--navy-700)]"
          aria-label="Quick action"
        >
          <Plus className="size-4" />
        </button>

        <Link
          href="/profile"
          aria-label="My profile"
          className={cn(
            "inline-flex rounded-full ring-offset-2 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy-400)]",
          )}
        >
          <Avatar
            size="sm"
            src={user.image}
            name={user.name ?? "BICKOSA Member"}
            className="border-[var(--border-2)] bg-[var(--navy-50)]"
          />
        </Link>
      </div>
    </header>
  );
}
