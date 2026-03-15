import { PageHeader } from "@/components/layout/page-header";

export default function AdminDashboardPage() {
  return (
    <section>
      <PageHeader
        eyebrow="Administration"
        title="Admin Dashboard"
        description="Management tools for users, verification, and platform operations."
      />
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <p className="text-sm text-[var(--text-2)]">
          Admin controls will be added here. Use this route to validate `/portal/admin/*` guard
          behavior.
        </p>
      </div>
    </section>
  );
}
