// The top of every page: a Fraunces title, one line of context under it and
// the main action on the right.
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow}
        <h1 className="font-heading text-[2rem] leading-tight font-medium tracking-tight">
          {title}
        </h1>
        {description ? (
          <div className="text-[0.9375rem] text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
