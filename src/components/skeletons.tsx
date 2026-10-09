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

// The same box as Panel and the list cards, so the content does not shift when
// it arrives.
const CARD = "rounded-lg border bg-card";

function Rows({ rows, bare }: { rows: number; bare: boolean }) {
  return (
    <div className={cn("divide-y", !bare && cn(CARD, "overflow-hidden"))}>
      {items(rows).map((row) => (
        <div
          key={row}
          className={cn(
            "flex flex-col gap-2 py-4",
            bare ? "first:pt-0 last:pb-0" : "px-4 sm:px-5",
          )}
        >
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-10 w-56 max-w-full" />
      <Skeleton className="h-5 w-80 max-w-full" />
    </div>
  );
}

// Rows in a card. `bare` leaves the card out, for a list that already sits
// inside a Panel.
export function ListSkeleton({
  rows = 6,
  bare = false,
}: {
  rows?: number;
  bare?: boolean;
}) {
  return (
    <Loading>
      <Rows rows={rows} bare={bare} />
    </Loading>
  );
}

// A whole page whose shell is not known yet: the page header, then a list.
export function PageSkeleton() {
  return (
    <Loading className="gap-6">
      <Header />
      <Rows rows={6} bare={false} />
    </Loading>
  );
}

// Fields in a card, like the application form. `bare` leaves the card out, for
// a form that already sits inside a Panel.
export function FormSkeleton({
  fields = 6,
  bare = false,
}: {
  fields?: number;
  bare?: boolean;
}) {
  return (
    <Loading className={cn("gap-5", !bare && cn(CARD, "p-5 sm:p-6"))}>
      {items(fields).map((field) => (
        <div key={field} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28 self-end" />
    </Loading>
  );
}

// A detail page: the header, the main card with its fields, and a second card
// beside it from `lg` up.
export function DetailSkeleton() {
  return (
    <Loading className="gap-6">
      <Header />
      <div className="grid items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <div className={cn(CARD, "flex flex-col gap-5 p-5 sm:p-6")}>
          <Skeleton className="h-5 w-28" />
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {items(6).map((field) => (
              <div key={field} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-40 max-w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className={cn(CARD, "flex flex-col gap-5 p-5 sm:p-6")}>
          <Skeleton className="h-5 w-28" />
          <div className="flex flex-col gap-3">
            {items(3).map((line) => (
              <Skeleton key={line} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </Loading>
  );
}

export function BoardSkeleton() {
  return (
    <Loading className="flex-row gap-3 overflow-hidden">
      {items(5).map((column) => (
        <div
          key={column}
          className="flex w-[82vw] shrink-0 flex-col gap-2.5 rounded-lg bg-muted p-2.5 sm:w-64"
        >
          <Skeleton className="m-1 h-5 w-24 bg-card" />
          {items(3 - (column % 2)).map((card) => (
            <Skeleton key={card} className="h-24 w-full rounded-lg bg-card" />
          ))}
        </div>
      ))}
    </Loading>
  );
}

export function ChartSkeleton() {
  return (
    <Loading>
      <Skeleton className="h-80 w-full" />
    </Loading>
  );
}

export function StatsSkeleton() {
  return (
    <Loading className="gap-4">
      <Skeleton className="h-8 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items(4).map((card) => (
          <Skeleton key={card} className="h-36 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-44 w-full rounded-lg" />
    </Loading>
  );
}
