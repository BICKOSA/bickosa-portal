import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LAST_UPDATED = "17 March 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gold-800)]">
            Legal
          </p>
          <h1 className="font-[var(--font-ui)] text-3xl font-semibold text-[var(--navy-900)]">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            This policy explains how BICKOSA processes personal data in line with Uganda&apos;s Data
            Protection and Privacy Act, 2019 (Act 9 of 2019).
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Data Controller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-2)]">
            <p>
              <strong>Bishop Cipriano Kihangire Old Students&apos; Association (BICKOSA)</strong> is
              the data controller for this portal.
            </p>
            <p>
              Contact:{" "}
              <a href="mailto:data@bickosa.org" className="text-[var(--navy-700)] underline">
                data@bickosa.org
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Data We Collect and Why</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--text-3)]">
                <tr>
                  <th className="px-2 py-2 font-semibold">Data type</th>
                  <th className="px-2 py-2 font-semibold">Purpose</th>
                  <th className="px-2 py-2 font-semibold">Legal basis (DPPA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-2)]">
                <tr>
                  <td className="px-2 py-2">Identity and contact details</td>
                  <td className="px-2 py-2">Membership verification, account access, communication</td>
                  <td className="px-2 py-2">Contractual necessity and consent</td>
                </tr>
                <tr>
                  <td className="px-2 py-2">Profile and alumni history</td>
                  <td className="px-2 py-2">Directory, chapter engagement, mentorship matching</td>
                  <td className="px-2 py-2">Legitimate interests and consent controls</td>
                </tr>
                <tr>
                  <td className="px-2 py-2">Event and RSVP records</td>
                  <td className="px-2 py-2">Attendance management and reminders</td>
                  <td className="px-2 py-2">Contractual necessity</td>
                </tr>
                <tr>
                  <td className="px-2 py-2">Donation records</td>
                  <td className="px-2 py-2">Payment processing, receipts, audit obligations</td>
                  <td className="px-2 py-2">Legal obligation and contractual necessity</td>
                </tr>
                <tr>
                  <td className="px-2 py-2">Analytics and usage metadata</td>
                  <td className="px-2 py-2">Service quality, performance, product improvements</td>
                  <td className="px-2 py-2">Legitimate interests with privacy safeguards</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retention Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-2)]">
            <p>We retain personal data only for as long as needed for the stated purposes.</p>
            <p>
              Membership and profile data is kept while your account is active. Financial transaction
              records may be retained longer for legal and audit obligations.
            </p>
            <p>
              When deletion is requested and approved, we remove or anonymize records where legally
              possible.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Sharing and Processors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-2)]">
            <p>We do not sell personal data and do not share data for third-party marketing.</p>
            <p>
              We use service providers as processors, including Vercel (hosting), Neon (database),
              Resend (email), and PostHog (analytics).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-2)]">
            <p>Under DPPA 2019, you may exercise your rights to access, rectification, erasure, portability, and objection.</p>
            <p>
              You can manage key controls in{" "}
              <Link href="/settings/privacy" className="text-[var(--navy-700)] underline">
                Privacy Settings
              </Link>{" "}
              or contact us at{" "}
              <a href="mailto:data@bickosa.org" className="text-[var(--navy-700)] underline">
                data@bickosa.org
              </a>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cross-Border Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-2)]">
            <p>
              Some data is hosted and processed outside Uganda through infrastructure providers such as
              Neon and Vercel.
            </p>
            <p>
              We apply contractual and technical safeguards to protect transferred data and uphold DPPA
              requirements.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cookies and Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-2)]">
            <p>
              We use essential cookies and anonymized analytics through PostHog to improve portal
              reliability and usability.
            </p>
            <p>We do not use advertising trackers.</p>
          </CardContent>
        </Card>

        <footer className="text-xs text-[var(--text-3)]">
          Last updated: <strong>{LAST_UPDATED}</strong>
        </footer>
      </div>
    </main>
  );
}
