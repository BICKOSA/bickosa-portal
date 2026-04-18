"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck2,
  EllipsisVertical,
  FileText,
  Handshake,
  HeartHandshake,
  LayoutGrid,
  LogOut,
  Settings,
  Trophy,
  UserCircle2,
  Users,
  Vote,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";
import {
  Sidebar as DashboardSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

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
      { label: "Cohorts", href: "/cohorts", icon: Users },
      { label: "Mentorship", href: "/mentorship", icon: Handshake },
      { label: "Committees", href: "/committees", icon: Users },
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
    items: [
      { label: "Donate", href: "/donate", icon: HeartHandshake, badge: "Live" },
    ],
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
    items: [
      { label: "Governance & Docs", href: "/governance", icon: FileText },
      { label: "Constitution", href: "/constitution", icon: FileText },
    ],
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
    { label: "Registrations", href: "/admin/registrations", icon: Users },
    { label: "School Records", href: "/admin/school-records", icon: FileText },
    { label: "Cohorts", href: "/admin/cohorts", icon: Users },
    { label: "Outreach", href: "/admin/outreach", icon: CalendarCheck2 },
    { label: "Elections", href: "/admin/elections", icon: Vote },
    { label: "Polls", href: "/admin/polls", icon: Vote },
    { label: "Committees", href: "/admin/committees", icon: Users },
    { label: "Constitution", href: "/admin/constitution", icon: FileText },
  ],
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavUser({ user }: { user: SidebarUser }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const memberName = user.name?.trim() || "BICKOSA Member";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar
              size="sm"
              src={user.image}
              name={memberName}
              className="border-sidebar-accent"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{memberName}</span>
              <span className="text-sidebar-foreground/60 truncate text-xs">
                {user.email ?? "Member"}
              </span>
            </div>
            <EllipsisVertical className="text-sidebar-foreground/60 ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar size="sm" src={user.image} name={memberName} />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{memberName}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email ?? "Member"}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => router.push("/profile")}>
                <UserCircle2 />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/settings")}>
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void authClient.signOut().then(() => {
                  router.replace("/login");
                });
              }}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const isAdmin = user.role === "admin";
  const navGroups = isAdmin ? [...baseNavGroups, adminNavGroup] : baseNavGroups;

  return (
    <DashboardSidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Dashboard"
              render={<Link href="/dashboard" />}
            >
              <Image
                src="/logo.png"
                alt="BICKOSA"
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-md object-contain"
                priority
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="text-sidebar-foreground truncate font-semibold">
                  BICKOSA
                </span>
                <span className="text-sidebar-foreground/60 truncate text-xs">
                  Alumni Portal
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2 py-3">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="text-sidebar-foreground/40 px-2 text-[10px] tracking-[0.14em] uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                        className={cn(
                          "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-9 text-[13px]",
                          active &&
                            "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-l-(--gold-500) font-medium",
                        )}
                      >
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                        {item.badge ? (
                          <Badge
                            variant={item.badge === "Live" ? "gold" : "outline"}
                            size="sm"
                            className={cn(
                              "ml-auto h-5 px-1.5 text-[10px]",
                              item.badge !== "Live" &&
                                "border-sidebar-foreground/20 text-sidebar-foreground/60",
                            )}
                          >
                            {item.badge}
                          </Badge>
                        ) : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t px-2 py-3">
        <SidebarNavUser user={user} />
        {isAdmin ? (
          <div className="px-2 pt-1 group-data-[collapsible=icon]:hidden">
            <Badge variant="gold" size="sm" className="h-5 px-2 text-[10px]">
              ADMIN
            </Badge>
          </div>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </DashboardSidebar>
  );
}
