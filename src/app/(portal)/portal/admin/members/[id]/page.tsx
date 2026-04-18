import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { MemberVerificationActions } from "@/app/(portal)/portal/admin/members/_components/member-verification-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  getAdminMemberProfileDetail,
  listAdminMemberChapterOptions,
} from "@/lib/admin-members";

type AdminMemberDetailsPageProps = {
  params: Promise<{ id: string }>;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function renderStatus(status: "pending" | "verified" | "rejected") {
  if (status === "verified") return <Badge variant="success">Verified</Badge>;
  if (status === "rejected") return <Badge variant="error">Rejected</Badge>;
  return <Badge variant="warning">Pending</Badge>;
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-sm text-[var(--text-2)] ${className ?? ""}`}>
      {label}: <strong>{value ?? "—"}</strong>
    </p>
  );
}

export default async function AdminMemberDetailsPage({
  params,
}: AdminMemberDetailsPageProps) {
  await requireAdminPageSession();
  const { id } = await params;

  const [member, chapterOptions] = await Promise.all([
    getAdminMemberProfileDetail(id),
    listAdminMemberChapterOptions(),
  ]);

  if (!member) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar size="lg" src={member.avatarUrl} name={member.fullName} />
          <div>
            <h2 className="text-2xl font-[var(--font-ui)] font-semibold text-[var(--navy-900)]">
              {member.fullName}
            </h2>
            <p className="text-sm text-[var(--text-3)]">{member.email}</p>
            <div className="mt-1">{renderStatus(member.status)}</div>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/members">Back to Members</Link>
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="First Name" value={member.firstName} />
              <DetailItem label="Last Name" value={member.lastName} />
              <DetailItem label="Email" value={member.email} />
              <DetailItem label="Status" value={member.status} />
              <DetailItem
                label="Year of Entry"
                value={member.yearOfEntry ?? "—"}
              />
              <DetailItem
                label="Year of Completion"
                value={member.yearOfCompletion ?? "—"}
              />
              <DetailItem
                label="Graduation Year Submitted"
                value={member.graduationYear ?? "—"}
              />
              <DetailItem label="Stream" value={member.stream ?? "—"} />
              <DetailItem label="House" value={member.house ?? "—"} />
              <DetailItem
                label="Notable Teachers"
                value={member.notableTeachers ?? "—"}
              />
              <DetailItem
                label="Current Job Title"
                value={member.currentJobTitle ?? "—"}
              />
              <DetailItem
                label="Current Employer"
                value={member.currentEmployer ?? "—"}
              />
              <DetailItem label="Industry" value={member.industry ?? "—"} />
              <DetailItem label="Phone" value={member.phone ?? "—"} />
              <DetailItem
                label="Location"
                value={`${member.locationCity ?? "—"}${member.locationCountry ? `, ${member.locationCountry}` : ""}`}
              />
              <DetailItem
                label="How They Heard"
                value={member.howTheyHeard ?? "—"}
              />
              <DetailItem
                label="Chapter"
                value={member.chapterName ?? "Unassigned"}
              />
              <DetailItem
                label="Membership Tier"
                value={member.membershipTier}
              />
              <DetailItem
                label="Membership Expires"
                value={
                  member.membershipExpiresAt
                    ? DATE_FORMATTER.format(member.membershipExpiresAt)
                    : "—"
                }
              />
              <DetailItem
                label="Verified At"
                value={
                  member.verifiedAt
                    ? DATE_TIME_FORMATTER.format(member.verifiedAt)
                    : "—"
                }
              />
              <DetailItem
                label="Joined"
                value={DATE_TIME_FORMATTER.format(member.joinedAt)}
              />
              <DetailItem
                label="LinkedIn"
                value={member.linkedinUrl ?? "—"}
                className="sm:col-span-2"
              />
              <DetailItem
                label="Website"
                value={member.websiteUrl ?? "—"}
                className="sm:col-span-2"
              />
              <DetailItem
                label="Bio"
                value={member.bio ?? "—"}
                className="sm:col-span-2"
              />
            </CardContent>
          </Card>

          {member.originalJoinSubmission ? (
            <Card>
              <CardHeader>
                <CardTitle>Original Join Submission</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Submitted Name"
                  value={member.originalJoinSubmission.fullName}
                />
                <DetailItem
                  label="Submitted Email"
                  value={member.originalJoinSubmission.email}
                />
                <DetailItem
                  label="Submitted Phone"
                  value={member.originalJoinSubmission.phone ?? "—"}
                />
                <DetailItem
                  label="Submitted Graduation Year"
                  value={member.originalJoinSubmission.graduationYear}
                />
                <DetailItem
                  label="Stream"
                  value={member.originalJoinSubmission.stream ?? "—"}
                />
                <DetailItem
                  label="House"
                  value={member.originalJoinSubmission.house ?? "—"}
                />
                <DetailItem
                  label="Current Location"
                  value={member.originalJoinSubmission.currentLocation ?? "—"}
                />
                <DetailItem
                  label="Occupation"
                  value={member.originalJoinSubmission.occupation ?? "—"}
                />
                <DetailItem
                  label="LinkedIn"
                  value={member.originalJoinSubmission.linkedinUrl ?? "—"}
                />
                <DetailItem
                  label="How They Heard"
                  value={member.originalJoinSubmission.howTheyHeard ?? "—"}
                />
                <DetailItem
                  label="School Record Match"
                  value={
                    member.originalJoinSubmission.schoolRecordMatch === null
                      ? "—"
                      : member.originalJoinSubmission.schoolRecordMatch
                        ? "Yes"
                        : "No"
                  }
                />
                <DetailItem
                  label="Submission Status"
                  value={member.originalJoinSubmission.verificationStatus}
                />
                <DetailItem
                  label="Submitted At"
                  value={DATE_TIME_FORMATTER.format(
                    member.originalJoinSubmission.submittedAt,
                  )}
                />
                <DetailItem
                  label="Reviewed At"
                  value={
                    member.originalJoinSubmission.reviewedAt
                      ? DATE_TIME_FORMATTER.format(
                          member.originalJoinSubmission.reviewedAt,
                        )
                      : "—"
                  }
                />
                <DetailItem
                  label="Notable Teachers / Memory Prompt"
                  value={member.originalJoinSubmission.notableTeachers ?? "—"}
                  className="sm:col-span-2"
                />
                <DetailItem
                  label="Verification Notes"
                  value={member.originalJoinSubmission.verificationNotes ?? "—"}
                  className="sm:col-span-2"
                />
                <DetailItem
                  label="Submission IP"
                  value={member.originalJoinSubmission.submissionIp ?? "—"}
                  className="sm:col-span-2"
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Verification History</CardTitle>
            </CardHeader>
            <CardContent>
              {member.verificationHistory.length === 0 ? (
                <p className="text-sm text-[var(--text-3)]">
                  No verification events yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {member.verificationHistory.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-[var(--r-md)] border border-[var(--border)] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{event.action}</Badge>
                          <p className="text-xs text-[var(--text-3)]">
                            by {event.actorName} ({event.actorEmail})
                          </p>
                        </div>
                        <p className="text-xs text-[var(--text-3)]">
                          {DATE_TIME_FORMATTER.format(event.createdAt)}
                        </p>
                      </div>
                      {event.notes ? (
                        <p className="mt-2 text-sm text-[var(--text-2)]">
                          {event.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card variant="navy-tint" accentBar>
            <CardHeader>
              <CardTitle>Verification Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <MemberVerificationActions
                profileId={member.profileId}
                chapterOptions={chapterOptions}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consent Log (Read-only)</CardTitle>
            </CardHeader>
            <CardContent>
              {member.consentLogs.length === 0 ? (
                <p className="text-sm text-[var(--text-3)]">
                  No consent records found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Granted</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.consentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.consentType}</TableCell>
                        <TableCell>
                          {log.granted ? (
                            <Badge variant="success">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {DATE_TIME_FORMATTER.format(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
