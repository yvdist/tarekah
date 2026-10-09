// The boxed message used for not-found and error states: a title, one line of
// explanation and the way out.
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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <h1 className="text-lg font-medium">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}
