import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { RANGE_PRESETS, type DateRange } from "../range";

// A plain GET form and links: the range lives in the URL, so it needs no
// client state.
export function RangeFilter({ range }: { range: DateRange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <nav aria-label="Rentang tanggal" className="flex flex-wrap gap-1">
        {RANGE_PRESETS.map((preset) => (
          <Link
            key={preset.value}
            href={
              preset.value === "all"
                ? "/dashboard"
                : `/dashboard?range=${preset.value}`
            }
            aria-current={range.preset === preset.value ? "true" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "rounded-full px-3",
              range.preset === preset.value &&
                "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {preset.label}
          </Link>
        ))}
      </nav>
      {/* Uncontrolled inputs keep their value across navigations, so the key
          resets them when the range changes. */}
      <form
        key={`${range.from}:${range.to}`}
        action="/dashboard"
        className="flex flex-wrap items-center gap-2"
      >
        <Input
          type="date"
          name="from"
          defaultValue={range.from ?? ""}
          aria-label="Tanggal apply dari"
          className="h-8 w-auto font-figure text-xs md:text-xs"
        />
        <span className="text-xs text-muted-foreground">sampai</span>
        <Input
          type="date"
          name="to"
          defaultValue={range.to ?? ""}
          aria-label="Tanggal apply sampai"
          className="h-8 w-auto font-figure text-xs md:text-xs"
        />
        <Button type="submit" variant="outline" size="sm">
          Terapkan
        </Button>
      </form>
    </div>
  );
}
