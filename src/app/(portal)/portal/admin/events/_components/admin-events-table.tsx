"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminEventListRow } from "@/lib/admin-events";

type AdminEventsTableProps = {
  events: AdminEventListRow[];
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTypeLabel(type: string): string {
  return `${type.slice(0, 1).toUpperCase()}${type.slice(1)}`;
}

export function AdminEventsTable({ events }: AdminEventsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function togglePublished(eventId: string, current: boolean) {
    setBusyId(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublished: !current }),
      });
      if (!response.ok) {
        throw new Error("Failed to update publish status.");
      }
      toast({
        title: current ? "Event moved to draft" : "Event published",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({
        title: "Could not update event",
        description: "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function archiveEvent(eventId: string) {
    const confirmed = window.confirm(
      "Archive this event? It will be unpublished and active registrations will be cancelled.",
    );
    if (!confirmed) {
      return;
    }

    setBusyId(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      if (!response.ok) {
        throw new Error("Failed to archive event.");
      }
      toast({
        title: "Event archived",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({
        title: "Could not archive event",
        description: "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (events.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <p className="text-sm text-[var(--text-2)]">No events yet. Create your first event.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>RSVPs / Max</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium text-[var(--text-1)]">{event.title}</TableCell>
              <TableCell>{formatTypeLabel(event.type)}</TableCell>
              <TableCell>{DATE_FORMATTER.format(event.startAt)}</TableCell>
              <TableCell>
                {event.isOnline ? "Online" : event.locationName ?? event.locationAddress ?? "TBA"}
              </TableCell>
              <TableCell>
                {event.attendeeCount} / {event.maxAttendees ?? "∞"}
              </TableCell>
              <TableCell>
                {event.isPublished ? <Badge variant="success">Published</Badge> : <Badge variant="outline">Draft</Badge>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/events/${event.id}/edit`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isLoading={busyId === event.id}
                    onClick={() => togglePublished(event.id, event.isPublished)}
                  >
                    {event.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[var(--error)] hover:text-[var(--error)]"
                    isLoading={busyId === event.id}
                    onClick={() => archiveEvent(event.id)}
                  >
                    Archive
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
