type DonorWallProps = {
  names: string[];
  totalCount: number;
};

export function DonorWall({ names, totalCount }: DonorWallProps) {
  if (totalCount === 0) {
    return (
      <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
        <h3 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">Donor Wall</h3>
        <p className="mt-2 text-sm text-[var(--text-2)]">
          Monthly donor recognitions will appear here as contributions come in.
        </p>
      </section>
    );
  }

  const visibleNames = names.slice(0, 14);
  const remainingCount = Math.max(0, totalCount - visibleNames.length);

  return (
    <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
      <h3 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">Donor Wall</h3>
      <p className="mt-1 text-sm text-[var(--text-2)]">
        Recognizing alumni who gave this month.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {visibleNames.map((name) => (
          <span
            key={name}
            className="rounded-[var(--r-full)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-1)]"
          >
            {name}
          </span>
        ))}
        {remainingCount > 0 ? (
          <span className="rounded-[var(--r-full)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-1)]">
            +{remainingCount} more
          </span>
        ) : null}
      </div>
    </section>
  );
}
