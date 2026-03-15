import Link from "next/link";

export default function PublicHomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <span className="mb-3 inline-flex w-fit rounded-[var(--r-full)] bg-[var(--gold-100)] px-3 py-1 text-xs font-medium text-[var(--gold-800)]">
        Bishop Cipriano Kihangire Old Students Association
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-[var(--text-1)]">
        BICKOSA Alumni Portal
      </h1>
      <p className="mt-4 max-w-2xl text-base text-[var(--text-2)]">
        The digital home for verified alumni across global chapters.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-[var(--r-md)] bg-[var(--navy-900)] px-4 py-2 text-sm font-medium text-[var(--white)] transition-colors hover:bg-[var(--navy-700)]"
        >
          Sign in
        </Link>
        <Link
          href="/about"
          className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-colors hover:bg-[var(--navy-50)]"
        >
          Learn more
        </Link>
      </div>
    </main>
  );
}
