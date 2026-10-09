// The message card used for not-found and error states: a title, one line of
// explanation and the way out. No cloud: that belongs to the empty states.
export function StateMessage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-14 text-center">
      <h1 className="font-heading text-2xl font-medium tracking-tight text-balance">
        {title}
      </h1>
      <p className="max-w-sm text-sm text-pretty text-muted-foreground">
        {description}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}
