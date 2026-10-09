import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RANGE_PRESETS, type DateRange } from "../range";

// A plain GET form and links: the range lives in the URL, so it needs no
// client state.
export function RangeFilter({ range }: { range: DateRange }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
            className={buttonVariants({
              variant: range.preset === preset.value ? "secondary" : "ghost",
              size: "sm",
            })}
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
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">sampai</span>
        <Input
          type="date"
          name="to"
          defaultValue={range.to ?? ""}
          aria-label="Tanggal apply sampai"
          className="w-auto"
        />
        <Button type="submit" variant="outline">
          Terapkan
        </Button>
      </form>
    </div>
  );
}
