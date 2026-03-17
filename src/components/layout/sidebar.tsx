"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck2,
  FileText,
  Handshake,
  HeartHandshake,
  LayoutGrid,
  Settings,
  Trophy,
  UserCircle2,
  Users,
  Vote,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SidebarUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  role?: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const baseNavGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutGrid }],
  },
  {
    label: "Community",
    items: [
      { label: "Alumni Directory", href: "/directory", icon: Users },
      { label: "Mentorship", href: "/mentorship", icon: Handshake },
    ],
  },
  {
    label: "Engage",
    items: [
      { label: "Events & RSVPs", href: "/events", icon: CalendarCheck2 },
      { label: "Voting", href: "/voting", icon: Vote },
      { label: "Careers", href: "/careers", icon: BriefcaseBusiness },
      { label: "Sports League", href: "/sports", icon: Trophy, badge: "Soon" },
    ],
  },
  {
    label: "Give Back",
    items: [{ label: "Donate", href: "/donate", icon: HeartHandshake, badge: "Live" }],
  },
  {
    label: "My Account",
    items: [
      { label: "My Profile", href: "/profile", icon: UserCircle2 },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    label: "About",
    items: [{ label: "Governance & Docs", href: "/governance", icon: FileText }],
  },
];

const adminNavGroup: { label: string; items: NavItem[] } = {
  label: "Admin",
  items: [
    { label: "Admin Dashboard", href: "/admin", icon: ShieldCheck },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Member Verification", href: "/admin/members", icon: Users },
    { label: "Careers Queue", href: "/admin/careers", icon: BriefcaseBusiness },
    { label: "Donations", href: "/admin/donations", icon: HeartHandshake },
    { label: "Events", href: "/admin/events", icon: CalendarCheck2 },
    { label: "Campaigns", href: "/admin/campaigns", icon: FileText },
    { label: "Elections", href: "/admin/elections", icon: Vote },
    { label: "Polls", href: "/admin/polls", icon: Vote },
  ],
};

const mobileNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Directory", href: "/directory", icon: Users },
  { label: "Careers", href: "/careers", icon: BriefcaseBusiness },
  { label: "Events", href: "/events", icon: CalendarCheck2 },
  { label: "Voting", href: "/voting", icon: Vote },
  { label: "Donate", href: "/donate", icon: HeartHandshake },
  { label: "Profile", href: "/profile", icon: UserCircle2 },
];

const mobileAdminNavItems: NavItem[] = [
  { label: "Admin", href: "/admin", icon: ShieldCheck },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Members", href: "/admin/members", icon: Users },
  { label: "Careers", href: "/admin/careers", icon: BriefcaseBusiness },
  { label: "Events", href: "/admin/events", icon: CalendarCheck2 },
  { label: "Elections", href: "/admin/elections", icon: Vote },
  { label: "Donate", href: "/admin/donations", icon: HeartHandshake },
  { label: "Profile", href: "/profile", icon: UserCircle2 },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const memberName = user.name?.trim() || "BICKOSA Member";
  const isAdmin = user.role === "admin";
  const navGroups = isAdmin ? [...baseNavGroups, adminNavGroup] : baseNavGroups;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-[color:rgba(255,255,255,0.08)] bg-[var(--navy-900)] text-[var(--white)] lg:flex">
        <div className="border-b border-[color:rgba(255,255,255,0.08)] px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="BICKOSA"
              width={40}
              height={40}
              className="size-10 shrink-0 object-contain"
              priority
            />
            <div className="min-w-0">
              <p className="font-[var(--font-ui)] text-[1.05rem] font-semibold leading-tight text-[var(--white)]">
                BICKOSA
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--navy-300)]">
                Alumni Portal
              </p>
            </div>
          </Link>

          <div className="mt-4 rounded-[var(--r-lg)] border border-[color:rgba(255,255,255,0.12)] bg-[color:rgba(255,255,255,0.04)] p-3">
            <div className="flex items-center gap-3">
              <Avatar
                size="md"
                src={user.image}
                name={memberName}
                className="border-[color:rgba(255,255,255,0.24)] bg-[var(--navy-700)] text-[var(--white)]"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--white)]">{memberName}</p>
                <p className="text-xs text-[var(--navy-300)]">Class of ----</p>
              </div>
            </div>
            <Badge variant="gold" size="sm" className="mt-3 h-5 px-2 text-[10px] uppercase tracking-wide">
              Verified
            </Badge>
            {isAdmin ? (
              <Badge variant="outline" size="sm" className="mt-2 h-5 px-2 text-[10px] uppercase tracking-wide">
                ADMIN
              </Badge>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--navy-400)]">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[var(--r-md)] border-l-2 border-transparent px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-[var(--gold-500)] bg-[color:rgba(255,255,255,0.08)] text-[var(--white)]"
                          : "text-[var(--navy-200)] hover:border-[color:rgba(201,168,76,0.65)] hover:bg-[color:rgba(255,255,255,0.05)] hover:text-[var(--white)]",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="ml-auto rounded-full bg-[var(--gold-500)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--navy-900)]">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <footer className="border-t border-[color:rgba(255,255,255,0.08)] px-5 py-4 text-xs text-[var(--navy-300)]">
          <p>BCK SSS · Luzira, Kampala</p>
          <Link href="/privacy-policy" className="mt-1 inline-block hover:text-[var(--white)]">
            Privacy Policy
          </Link>
        </footer>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-6 border-t border-[color:rgba(255,255,255,0.12)] bg-[color:rgba(13,27,62,0.98)] px-1 lg:hidden">
        {(isAdmin ? mobileAdminNavItems : mobileNavItems).map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-[var(--r-md)] text-[10px] font-medium",
                active ? "text-[var(--gold-500)]" : "text-[var(--navy-200)]",
              )}
            >
              <Icon className={cn("size-4", active ? "text-[var(--gold-500)]" : "text-[var(--white)]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
