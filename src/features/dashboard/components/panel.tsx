import { cn } from "@/lib/utils";

// A titled card on the dashboard: the title on the left, one quiet line of
// context on the right.
export function Panel({
  id,
  title,
  hint,
  className,
  children,
}: {
  id?: string;
  title: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "flex scroll-mt-6 flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6",
        className,
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[0.9375rem] font-medium">{title}</h2>
        {hint ? (
          <div className="text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}
