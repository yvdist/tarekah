import { cn } from "@/lib/utils";

// A titled card: the title on the left, and on the right either one quiet line
// of context or the section's own action.
export function Panel({
  id,
  title,
  hint,
  action,
  className,
  children,
}: {
  id?: string;
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
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
      <header
        className={cn(
          "flex flex-wrap justify-between gap-x-4 gap-y-1",
          action ? "items-center" : "items-baseline",
        )}
      >
        <h2 className="text-[0.9375rem] font-medium">{title}</h2>
        {hint ? (
          <div className="text-xs text-muted-foreground">{hint}</div>
        ) : null}
        {action}
      </header>
      {children}
    </section>
  );
}
