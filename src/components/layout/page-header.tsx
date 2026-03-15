type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gold-800)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-[var(--font-ui)] text-3xl font-semibold text-[var(--navy-900)]">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-3)]">{description}</p>
      ) : null}
    </div>
  );
}
