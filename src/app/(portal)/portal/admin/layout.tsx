import { AdminBreadcrumbs } from "@/app/(portal)/portal/admin/_components/admin-breadcrumbs";
import { Badge } from "@/components/ui/badge";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--r-md)] border border-[var(--gold-300)] bg-[var(--gold-50)] px-3 py-2 text-sm text-[var(--gold-800)]">
        <span className="font-semibold">You are in Admin Mode</span>
        <Badge variant="gold" className="ml-2">
          ADMIN
        </Badge>
      </div>
      <AdminBreadcrumbs />
      {children}
    </div>
  );
}
