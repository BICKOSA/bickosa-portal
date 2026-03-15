import Link from "next/link";

const portalLinks = [
  { href: "/portal", label: "Dashboard" },
  { href: "/events-preview", label: "Events" },
  { href: "/about", label: "About" },
];

export function Sidebar() {
  return (
    <aside className="min-h-screen w-64 bg-[var(--navy-900)] px-4 py-6 text-[var(--white)]">
      <div className="mb-8 border-l-4 border-[var(--gold-500)] pl-3">
        <p className="text-sm uppercase tracking-wide text-[var(--gold-200)]">
          BICKOSA
        </p>
        <h1 className="text-xl font-semibold text-[var(--white)]">Portal</h1>
      </div>

      <nav className="space-y-2">
        {portalLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-[var(--r-md)] px-3 py-2 text-sm text-[var(--navy-100)] transition-colors hover:bg-[var(--navy-700)] hover:text-[var(--white)]"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
