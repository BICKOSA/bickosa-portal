import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gold-800)]">
            Legal
          </p>
          <h1 className="font-[var(--font-ui)] text-3xl font-semibold text-[var(--navy-900)]">
            Terms of Service
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            These terms govern use of the BICKOSA Alumni Portal and related services.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Membership Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-2)]">
            Membership is intended for alumni (alumnus or alumna) of Bishop Cipriano Kihangire
            Secondary School (BCK SSS). We may verify credentials before granting or maintaining
            access.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceptable Use of the Directory</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-2)]">
            Directory information is for legitimate alumni networking and community engagement only.
            Scraping, unsolicited marketing, harassment, or misuse of member contact details is
            prohibited.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events RSVP and Cancellation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-2)]">
            Members are expected to RSVP accurately. If plans change, cancel promptly in the portal
            to free capacity for other alumni. Event-specific deadlines and paid ticket terms apply.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Donation Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-2)]">
            <p>Donations made through the portal are final and non-refundable unless required by law.</p>
            <p>
              BICKOSA commits to issuing a donation receipt for completed payments and maintaining
              transparent campaign reporting.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Suspension Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-2)]">
            We may suspend or restrict accounts for policy violations, fraudulent activity, abuse of
            community members, or security risks. Serious or repeated violations may lead to account
            termination.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-2)]">
            These terms are governed by the laws of Uganda.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
