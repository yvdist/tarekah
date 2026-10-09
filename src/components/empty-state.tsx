import { MegaMendung } from "@/components/brand/mega-mendung";

// For a page or a section with nothing in it yet: a small cloud, an inviting
// title, one sentence, one action.
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-14 text-center">
      <MegaMendung className="mb-1 w-20 text-primary" />
      <h2 className="font-heading text-2xl font-medium tracking-tight text-balance">
        {title}
      </h2>
      <p className="max-w-sm text-sm text-pretty text-muted-foreground">
        {description}
      </p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
