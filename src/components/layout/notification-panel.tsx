"use client";

import * as React from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  HandHeart,
  HeartHandshake,
  Megaphone,
  ShieldCheck,
  ShieldX,
  Target,
  Vote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

const notificationsQueryKey = ["notifications"] as const;

function getNotificationIcon(type: string) {
  switch (type) {
    case "verification_approved":
      return ShieldCheck;
    case "verification_rejected":
      return ShieldX;
    case "event_reminder":
      return CalendarClock;
    case "rsvp_confirmed":
      return CheckCircle2;
    case "donation_received":
      return HandHeart;
    case "mentorship_request":
    case "mentorship_accepted":
      return HeartHandshake;
    case "new_campaign":
      return Megaphone;
    case "campaign_milestone":
      return Target;
    case "nomination_submitted":
      return CheckSquare;
    case "peer_nomination_received":
      return Vote;
    case "voting_open":
    case "poll_open":
      return Vote;
    case "results_published":
      return CheckCircle2;
    default:
      return BriefcaseBusiness;
  }
}

async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch("/api/notifications", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load notifications.");
  }

  return (await response.json()) as NotificationsResponse;
}

export function NotificationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  });

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const items = notificationsQuery.data?.items ?? [];
  const isLoading = notificationsQuery.isLoading;
  const isWorking = notificationsQuery.isFetching;

  async function refreshNotifications() {
    await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  }

  async function markAllAsRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
    });

    if (!response.ok) {
      throw new Error("Failed to mark all notifications as read.");
    }

    await refreshNotifications();
  }

  async function markOneAsRead(notificationId: string) {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error("Failed to mark notification as read.");
    }

    await refreshNotifications();
  }

  async function handleMarkAll() {
    try {
      await markAllAsRead();
    } catch (error) {
      toast({
        title: "Could not update notifications",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleNotificationClick(item: NotificationItem) {
    if (!item.isRead) {
      try {
        await markOneAsRead(item.id);
      } catch (error) {
        toast({
          title: "Could not update notification",
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    }

    if (item.actionUrl) {
      window.location.href = item.actionUrl;
    }
  }

  return (
    <>
      <button
        type="button"
        className="relative inline-flex size-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-2)] transition-colors hover:bg-[var(--navy-50)] hover:text-[var(--navy-700)]"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--gold-500)]" />
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full border-[var(--border)] bg-[var(--white)] p-0 sm:max-w-md"
        >
          <SheetHeader className="space-y-2 border-b border-[var(--border)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="font-[var(--font-ui)] text-[var(--navy-900)]">
                  Notifications
                </SheetTitle>
                <SheetDescription className="text-[var(--text-2)]">
                  Latest updates from your BICKOSA activities.
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={unreadCount === 0 || isWorking}
                onClick={handleMarkAll}
              >
                Mark all read
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-[var(--text-3)]">Loading notifications...</p>
            ) : null}

            {!isLoading && items.length === 0 ? (
              <EmptyState
                title="You're all caught up"
                body="No new notifications."
                className="border-dashed py-10 shadow-none"
              />
            ) : null}

            {!isLoading ? (
              <ul className="space-y-2">
                {items.map((item) => {
                  const Icon = getNotificationIcon(item.type);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void handleNotificationClick(item)}
                        className="w-full rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-3 text-left transition-colors hover:bg-[var(--surface)]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--navy-50)] text-[var(--navy-700)]">
                            <Icon className="size-4" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-[var(--text-1)]">{item.title}</p>
                              {!item.isRead ? (
                                <span className="mt-1 inline-block size-2 shrink-0 rounded-full bg-[var(--gold-500)]" />
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-[var(--text-2)]">{item.body}</p>
                            <p className="mt-2 text-xs text-[var(--text-3)]">
                              {formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
