export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--white)] px-6">
      <p className="font-medium text-[var(--text-1)]">Welcome to BICKOSA</p>
      <div className="rounded-[var(--r-full)] bg-[var(--navy-50)] px-3 py-1 text-xs text-[var(--text-2)]">
        Alumni Portal
      </div>
    </header>
  );
}
