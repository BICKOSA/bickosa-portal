type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-[var(--text-1)]">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-[var(--text-2)]">{description}</p>
      ) : null}
    </div>
  );
}
