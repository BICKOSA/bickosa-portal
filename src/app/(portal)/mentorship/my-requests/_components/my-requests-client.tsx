"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RequestStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";

export type OutgoingMentorshipRequest = {
  id: string;
  mentorName: string;
  field: string | null;
  message: string | null;
  status: RequestStatus;
  mentorResponse: string | null;
  schedulingUrl: string | null;
  createdAt: string;
};

export type IncomingMentorshipRequest = {
  id: string;
  menteeName: string;
  field: string | null;
  message: string | null;
  status: RequestStatus;
  createdAt: string;
};

type MyRequestsClientProps = {
  initialOutgoing: OutgoingMentorshipRequest[];
  initialIncoming: IncomingMentorshipRequest[];
};

function statusBadgeVariant(status: RequestStatus): "success" | "warning" | "outline" {
  if (status === "accepted") {
    return "success";
  }
  if (status === "declined") {
    return "warning";
  }
  return "outline";
}

export function MyRequestsClient({ initialOutgoing, initialIncoming }: MyRequestsClientProps) {
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [schedulingUrls, setSchedulingUrls] = useState<Record<string, string>>({});
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);

  const pendingIncoming = useMemo(
    () => incoming.filter((request) => request.status === "pending"),
    [incoming],
  );

  async function cancelRequest(requestId: string) {
    setLoadingRequestId(requestId);
    const response = await fetch(`/api/mentorship/${requestId}`, { method: "DELETE" });
    setLoadingRequestId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(body?.message ?? "Failed to cancel request.");
      return;
    }

    setOutgoing((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, status: "cancelled" as const } : request,
      ),
    );
    toast.success("Request cancelled.");
  }

  async function updateIncomingRequest(requestId: string, decision: "accepted" | "declined") {
    setLoadingRequestId(requestId);
    const response = await fetch(`/api/mentorship/${requestId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: decision,
        mentorResponse: responses[requestId] ?? "",
        schedulingUrl: schedulingUrls[requestId] ?? "",
      }),
    });
    setLoadingRequestId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(body?.message ?? "Failed to update request.");
      return;
    }

    setIncoming((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, status: decision } : request,
      ),
    );
    toast.success(decision === "accepted" ? "Request accepted." : "Request declined.");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>My outgoing requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {outgoing.length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">You have not sent any mentorship requests.</p>
          ) : (
            outgoing.map((request) => (
              <div key={request.id} className="rounded-[var(--r-lg)] border border-[var(--border)] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text-1)]">{request.mentorName}</p>
                  <Badge variant={statusBadgeVariant(request.status)}>
                    {request.status}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-3)]">{request.field ?? "General mentorship"}</p>
                <p className="mt-2 text-sm text-[var(--text-2)]">{request.message}</p>
                {request.mentorResponse ? (
                  <p className="mt-2 rounded-[var(--r-md)] bg-[var(--navy-50)] px-2 py-1 text-xs text-[var(--text-2)]">
                    Mentor response: {request.mentorResponse}
                  </p>
                ) : null}
                {request.schedulingUrl ? (
                  <p className="mt-2 text-xs text-[var(--text-2)]">
                    Scheduling URL: {request.schedulingUrl}
                  </p>
                ) : null}
                {request.status === "pending" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => cancelRequest(request.id)}
                    isLoading={loadingRequestId === request.id}
                  >
                    Cancel request
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incoming requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {incoming.length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">No mentorship requests have been sent to you yet.</p>
          ) : (
            incoming.map((request) => (
              <div key={request.id} className="rounded-[var(--r-lg)] border border-[var(--border)] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text-1)]">{request.menteeName}</p>
                  <Badge variant={statusBadgeVariant(request.status)}>
                    {request.status}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-3)]">{request.field ?? "General mentorship"}</p>
                <p className="mt-2 text-sm text-[var(--text-2)]">{request.message}</p>

                {request.status === "pending" ? (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      label="Response (optional if declining)"
                      value={responses[request.id] ?? ""}
                      onChange={(event) =>
                        setResponses((current) => ({ ...current, [request.id]: event.target.value }))
                      }
                      maxLength={180}
                    />
                    <Input
                      label="Scheduling URL (optional)"
                      placeholder="https://calendly.com/..."
                      value={schedulingUrls[request.id] ?? ""}
                      onChange={(event) =>
                        setSchedulingUrls((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => updateIncomingRequest(request.id, "accepted")}
                        isLoading={loadingRequestId === request.id}
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateIncomingRequest(request.id, "declined")}
                        isLoading={loadingRequestId === request.id}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
          {pendingIncoming.length > 0 ? (
            <p className="text-xs text-[var(--text-3)]">
              Pending requests: {pendingIncoming.length}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
