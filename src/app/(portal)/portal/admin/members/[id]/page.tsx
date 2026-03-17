import Link from "next/link";
import { notFound } from "next/navigation";

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
import { getAdminMemberProfileDetail, listAdminMemberChapterOptions } from "@/lib/admin-members";

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

export default async function AdminMemberDetailsPage({ params }: AdminMemberDetailsPageProps) {
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
            <h2 className="font-[var(--font-ui)] text-2xl font-semibold text-[var(--navy-900)]">
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
              <p className="text-sm text-[var(--text-2)]">First Name: <strong>{member.firstName}</strong></p>
              <p className="text-sm text-[var(--text-2)]">Last Name: <strong>{member.lastName}</strong></p>
              <p className="text-sm text-[var(--text-2)]">Email: <strong>{member.email}</strong></p>
              <p className="text-sm text-[var(--text-2)]">Status: <strong>{member.status}</strong></p>
              <p className="text-sm text-[var(--text-2)]">
                Year of Entry: <strong>{member.yearOfEntry ?? "—"}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)]">
                Year of Completion: <strong>{member.yearOfCompletion ?? "—"}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)]">
                Current Job Title: <strong>{member.currentJobTitle ?? "—"}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)]">
                Current Employer: <strong>{member.currentEmployer ?? "—"}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)]">Industry: <strong>{member.industry ?? "—"}</strong></p>
              <p className="text-sm text-[var(--text-2)]">Phone: <strong>{member.phone ?? "—"}</strong></p>
              <p className="text-sm text-[var(--text-2)]">
                Location: <strong>{member.locationCity ?? "—"}{member.locationCountry ? `, ${member.locationCountry}` : ""}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)]">Chapter: <strong>{member.chapterName ?? "Unassigned"}</strong></p>
              <p className="text-sm text-[var(--text-2)]">
                Membership Tier: <strong>{member.membershipTier}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)]">
                Membership Expires:{" "}
                <strong>{member.membershipExpiresAt ? DATE_FORMATTER.format(member.membershipExpiresAt) : "—"}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)]">
                Verified At: <strong>{member.verifiedAt ? DATE_TIME_FORMATTER.format(member.verifiedAt) : "—"}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)]">
                Joined: <strong>{DATE_TIME_FORMATTER.format(member.joinedAt)}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)] sm:col-span-2">
                LinkedIn: <strong>{member.linkedinUrl ?? "—"}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)] sm:col-span-2">
                Website: <strong>{member.websiteUrl ?? "—"}</strong>
              </p>
              <p className="text-sm text-[var(--text-2)] sm:col-span-2">
                Bio: <strong>{member.bio ?? "—"}</strong>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification History</CardTitle>
            </CardHeader>
            <CardContent>
              {member.verificationHistory.length === 0 ? (
                <p className="text-sm text-[var(--text-3)]">No verification events yet.</p>
              ) : (
                <div className="space-y-3">
                  {member.verificationHistory.map((event) => (
                    <div key={event.id} className="rounded-[var(--r-md)] border border-[var(--border)] p-3">
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
                      {event.notes ? <p className="mt-2 text-sm text-[var(--text-2)]">{event.notes}</p> : null}
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
              <MemberVerificationActions profileId={member.profileId} chapterOptions={chapterOptions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consent Log (Read-only)</CardTitle>
            </CardHeader>
            <CardContent>
              {member.consentLogs.length === 0 ? (
                <p className="text-sm text-[var(--text-3)]">No consent records found.</p>
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
                          {log.granted ? <Badge variant="success">Yes</Badge> : <Badge variant="outline">No</Badge>}
                        </TableCell>
                        <TableCell>{DATE_TIME_FORMATTER.format(log.createdAt)}</TableCell>
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
