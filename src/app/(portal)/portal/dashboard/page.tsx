import { PageHeader } from "@/components/layout/page-header";

export default function PortalDashboardPage() {
  return (
    <section>
      <PageHeader
        eyebrow="Overview"
        title="Alumni Dashboard"
        description="Overview of chapter activity, events, and contributions."
      />
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <p className="text-sm text-[var(--text-2)]">
          Portal feature modules will be added here.
        </p>
      </div>
    </section>
  );
}
