import { cn } from "@/lib/utils";
import { formatDays, formatPercent } from "../format";
import type { DashboardStats } from "../queries";

// The four figures at the top. The first counts every application as a step.
export function SummaryCards({ summary }: Pick<DashboardStats, "summary">) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        value={summary.total}
        label="léngkah ikhtiar"
        labelClassName="font-heading text-lg"
        hint="Semua lamaran yang dicatat"
      />
      <Stat
        value={summary.active}
        label="Lamaran aktif"
        hint="Menunggu kabar"
      />
      <Stat
        value={summary.interviews}
        label="Interview"
        hint="Pernah sampai tahap ini"
      />
      <Stat
        value={summary.offers}
        label="Offer"
        hint="Pernah sampai tahap ini"
        valueClassName={summary.offers > 0 ? "text-success" : undefined}
      />
    </div>
  );
}

// How often, and how fast, companies answer.
export function ResponseStats({
  summary,
  responseTime,
}: Pick<DashboardStats, "summary" | "responseTime">) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Stat
        size="sm"
        value={formatPercent(summary.responseRate)}
        label="Response rate"
        hint={`${summary.responded} dari ${summary.submitted} lamaran terkirim`}
      />
      <Stat
        size="sm"
        value={formatDays(responseTime.averageDays)}
        label="Rata-rata waktu respons"
        hint={
          responseTime.sample === 0
            ? "Belum ada lamaran yang direspons"
            : `Dari Dilamar ke respons pertama, ${responseTime.sample} lamaran`
        }
      />
    </div>
  );
}

// Each card is its own description list: a <dl> may not have its terms nested
// two elements deep, which is what wrapping all the cards in one would do.
// The figure is shown first but stays the description of its label.
function Stat({
  value,
  label,
  hint,
  size = "default",
  valueClassName,
  labelClassName,
}: {
  value: number | string;
  label: string;
  hint?: string;
  size?: "default" | "sm";
  valueClassName?: string;
  labelClassName?: string;
}) {
  return (
    <dl className="flex flex-col rounded-lg border bg-card p-5">
      <dt className={cn("text-[0.9375rem] font-medium", labelClassName)}>
        {label}
      </dt>
      <dd
        className={cn(
          "order-first font-heading leading-none font-medium tracking-tight",
          size === "sm" ? "mb-2 text-3xl" : "mb-3 text-5xl",
          valueClassName,
        )}
      >
        {value}
      </dd>
      {hint ? (
        <dd className="mt-1.5 text-xs text-muted-foreground">{hint}</dd>
      ) : null}
    </dl>
  );
}
