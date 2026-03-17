"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { SchoolRecordMatchResult } from "@/lib/alumni-growth";

type RegistrationDetail = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  graduationYear: number;
  stream: string | null;
  house: string | null;
  notableTeachers: string | null;
  currentLocation: string | null;
  occupation: string | null;
  linkedinUrl: string | null;
  howTheyHeard: string | null;
  verificationStatus: "pending" | "verified" | "rejected" | "duplicate";
  schoolRecordMatch: boolean | null;
  verificationNotes: string | null;
};

type DuplicateMatch = {
  id: string;
  fullName: string;
  email: string;
  graduationYear: number | null;
  yearOfCompletion: number | null;
};

type Props = {
  registration: RegistrationDetail;
  schoolMatches: SchoolRecordMatchResult[];
  duplicateMatches: DuplicateMatch[];
};

export function RegistrationDetailClient({
  registration,
  schoolMatches,
  duplicateMatches,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isBusy, setIsBusy] = useState(false);
  const [notes, setNotes] = useState(registration.verificationNotes ?? "");
  const [schoolRecordMatch, setSchoolRecordMatch] = useState<boolean>(
    registration.schoolRecordMatch ?? schoolMatches.length > 0,
  );

  async function runAction(
    endpoint: "verify-create-account" | "reject" | "duplicate",
    body: Record<string, unknown>,
    successMessage: string,
  ) {
    setIsBusy(true);
    try {
      const response = await fetch(
        `/api/admin/registrations/${registration.id}/${endpoint}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Action failed.");
      }
      toast({
        title: successMessage,
        variant: "success",
      });
      router.push("/admin/registrations");
      router.refresh();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--navy-900)]">
          Registration detail
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/registrations">Back to queue</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 text-sm">
          <p>
            <strong>Name:</strong> {registration.fullName}
          </p>
          <p>
            <strong>Email:</strong> {registration.email}
          </p>
          <p>
            <strong>Phone:</strong> {registration.phone ?? "-"}
          </p>
          <p>
            <strong>Graduation year:</strong> {registration.graduationYear}
          </p>
          <p>
            <strong>Stream:</strong> {registration.stream ?? "-"}
          </p>
          <p>
            <strong>House:</strong> {registration.house ?? "-"}
          </p>
          <p>
            <strong>Location:</strong> {registration.currentLocation ?? "-"}
          </p>
          <p>
            <strong>Occupation:</strong> {registration.occupation ?? "-"}
          </p>
          <p>
            <strong>LinkedIn:</strong> {registration.linkedinUrl ?? "-"}
          </p>
          <p>
            <strong>How heard:</strong> {registration.howTheyHeard ?? "-"}
          </p>
          <p>
            <strong>Memory prompt:</strong> {registration.notableTeachers ?? "-"}
          </p>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
          <p className="text-sm font-medium text-[var(--text-1)]">
            Manual verification controls
          </p>
          <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-[var(--text-1)]">
            School record decision
            <select
              value={schoolRecordMatch ? "match" : "no-match"}
              onChange={(event) =>
                setSchoolRecordMatch(event.target.value === "match")
              }
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm"
            >
              <option value="match">Strong / accepted match</option>
              <option value="no-match">No match / override to false</option>
            </select>
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-[var(--text-1)]">
            Verification notes
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-3 py-2 text-sm"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="navy"
              isLoading={isBusy}
              onClick={() =>
                void runAction(
                  "verify-create-account",
                  { schoolRecordMatch, verificationNotes: notes || undefined },
                  "Registration verified and account created",
                )
              }
            >
              Verify &amp; Create Account
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() =>
                void runAction(
                  "duplicate",
                  { notes: notes || undefined },
                  "Marked as duplicate",
                )
              }
            >
              Mark Duplicate
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() =>
                void runAction(
                  "reject",
                  { reason: notes || undefined },
                  "Registration rejected",
                )
              }
            >
              Reject
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
        <p className="text-sm font-medium text-[var(--text-1)]">
          School record matches
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {schoolMatches.length === 0 ? (
            <li className="text-[var(--text-2)]">No suggested match found.</li>
          ) : (
            schoolMatches.map((match) => (
              <li
                key={match.record.id}
                className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {match.record.fullName} ({match.record.graduationYear}) ·{" "}
                    {match.label} · score {match.score}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSchoolRecordMatch(true);
                      setNotes((current) =>
                        current
                          ? current
                          : `Matched record: ${match.record.fullName} (${match.record.id})`,
                      );
                    }}
                  >
                    Use this match
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
        <p className="text-sm font-medium text-[var(--text-1)]">
          Possible duplicate profiles
        </p>
        <ul className="mt-3 space-y-2 text-sm text-[var(--text-2)]">
          {duplicateMatches.length === 0 ? (
            <li>No duplicate profiles found.</li>
          ) : (
            duplicateMatches.map((item) => (
              <li key={item.id}>
                {item.fullName} — {item.email} (
                {item.graduationYear ?? item.yearOfCompletion ?? "Unknown year"})
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
