import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Placeholders shown by <Suspense> while a section's data loads. Each one
// roughly matches the shape of what replaces it, so the page does not jump.

function Loading({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className={cn("flex flex-col gap-3", className)}>
      <span className="sr-only">Memuat…</span>
      {children}
    </div>
  );
}

const items = (count: number) => Array.from({ length: count }, (_, i) => i);

export function TextSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <Loading className="gap-2">
      {items(lines).map((line) => (
        <Skeleton key={line} className="h-4 w-full max-w-xs last:max-w-48" />
      ))}
    </Loading>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Loading>
      {items(rows).map((row) => (
        <Skeleton key={row} className="h-12 w-full" />
      ))}
    </Loading>
  );
}

// A whole page whose shell is not known yet: heading, then rows.
export function PageSkeleton() {
  return (
    <Loading className="gap-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex flex-col gap-3">
        {items(6).map((row) => (
          <Skeleton key={row} className="h-12 w-full" />
        ))}
      </div>
    </Loading>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Loading className="gap-5">
      {items(fields).map((field) => (
        <div key={field} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28" />
    </Loading>
  );
}

export function DetailSkeleton() {
  return (
    <Loading className="gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items(6).map((field) => (
          <div key={field} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </div>
      <Skeleton className="h-32 w-full" />
    </Loading>
  );
}

export function BoardSkeleton() {
  return (
    <Loading className="flex-row gap-4 overflow-hidden">
      {items(4).map((column) => (
        <div key={column} className="flex w-64 shrink-0 flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          {items(3 - (column % 2)).map((card) => (
            <Skeleton key={card} className="h-20 w-full" />
          ))}
        </div>
      ))}
    </Loading>
  );
}

export function ChartSkeleton() {
  return (
    <Loading>
      <Skeleton className="h-56 w-full" />
    </Loading>
  );
}

export function StatsSkeleton() {
  return (
    <Loading className="gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items(4).map((card) => (
          <Skeleton key={card} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-56 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </Loading>
  );
}
