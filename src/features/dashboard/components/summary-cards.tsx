import { Card, CardContent } from "@/components/ui/card";
import { formatDays, formatPercent } from "../format";
import type { DashboardStats } from "../queries";

export function SummaryCards({
  summary,
  responseTime,
}: Pick<DashboardStats, "summary" | "responseTime">) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat label="Total lamaran" value={summary.total} />
      <Stat label="Aktif" value={summary.active} hint="Menunggu kabar" />
      <Stat
        label="Interview"
        value={summary.interviews}
        hint="Pernah sampai tahap ini"
      />
      <Stat
        label="Offer"
        value={summary.offers}
        hint="Pernah sampai tahap ini"
      />
      <Stat
        label="Response rate"
        value={formatPercent(summary.responseRate)}
        hint={`${summary.responded} dari ${summary.submitted} lamaran terkirim`}
      />
      <Stat
        label="Rata-rata waktu respons"
        value={formatDays(responseTime.averageDays)}
        hint={
          responseTime.sample === 0
            ? "Belum ada lamaran yang direspons"
            : `Dari Dilamar ke respons pertama, ${responseTime.sample} lamaran`
        }
      />
    </dl>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-2xl font-semibold tracking-tight">{value}</dd>
        {hint ? (
          <dd className="text-xs text-muted-foreground">{hint}</dd>
        ) : null}
      </CardContent>
    </Card>
  );
}
