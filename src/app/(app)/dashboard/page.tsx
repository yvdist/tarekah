import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ChartSkeleton,
  ListSkeleton,
  StatsSkeleton,
} from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FollowUpActions } from "@/features/applications/components/follow-up-actions";
import { FollowUpBadge } from "@/features/applications/components/follow-up-badge";
import { StatusBadge } from "@/features/applications/components/status-badge";
import { formatDateTime } from "@/features/applications/format";
import { SOURCE_LABELS, STATUS_LABELS } from "@/features/applications/labels";
import { getFollowUpItems } from "@/features/applications/queries";
import { FunnelChart } from "@/features/dashboard/components/funnel-chart";
import { RangeFilter } from "@/features/dashboard/components/range-filter";
import { RateBreakdown } from "@/features/dashboard/components/rate-breakdown";
import { SummaryCards } from "@/features/dashboard/components/summary-cards";
import { WeeklyChart } from "@/features/dashboard/components/weekly-chart";
import { formatShortDate } from "@/features/dashboard/format";
import {
  getDashboardStats,
  getWeeklyApplications,
} from "@/features/dashboard/queries";
import { resolveCurrentRange } from "@/features/dashboard/range";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Perlu Follow-up</h2>
        <Suspense fallback={<ListSkeleton rows={3} />}>
          <FollowUpPanel />
        </Suspense>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Statistik</h2>
        <Suspense fallback={<StatsSkeleton />}>
          <Statistics searchParams={searchParams} />
        </Suspense>
        <ChartCard
          title="Lamaran per minggu"
          description="12 minggu terakhir menurut tanggal apply. Tidak mengikuti filter."
        >
          <Suspense fallback={<ChartSkeleton />}>
            <Weekly />
          </Suspense>
        </ChartCard>
      </section>
    </div>
  );
}

// searchParams is request-time data, so it is read behind the boundary.
async function Statistics({
  searchParams,
}: Pick<PageProps<"/dashboard">, "searchParams">) {
  const params = await searchParams;
  const range = await resolveCurrentRange(params);
  const stats = await getDashboardStats(range);

  return (
    <>
      <RangeFilter range={range} />
      {stats.summary.total === 0 ? (
        <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          {range.preset === "all"
            ? "Belum ada lamaran. Statistik muncul setelah lamaran pertama dicatat."
            : "Tidak ada lamaran dengan tanggal apply pada rentang ini."}
        </p>
      ) : (
        <>
          <SummaryCards
            summary={stats.summary}
            responseTime={stats.responseTime}
          />
          <ChartCard
            title="Funnel"
            description="Jumlah lamaran yang pernah mencapai tiap tahap."
          >
            <FunnelChart
              data={stats.funnel.map((row) => ({
                label: STATUS_LABELS[row.stage],
                count: row.count,
              }))}
            />
          </ChartCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Per sumber loker"
              description="Persentase lamaran terkirim yang direspons dan yang sampai interview."
            >
              <RateBreakdown
                dimension="Sumber"
                rows={stats.bySource.map((row) => ({
                  ...row,
                  key: row.source,
                  label: SOURCE_LABELS[row.source],
                }))}
              />
            </ChartCard>
            <ChartCard
              title="Per versi CV"
              description="Persentase lamaran terkirim yang direspons dan yang sampai interview."
            >
              <RateBreakdown
                dimension="Versi CV"
                rows={stats.byCv.map((row) => ({
                  ...row,
                  key: row.id ?? "none",
                  label: row.label ?? "Tanpa CV",
                }))}
              />
            </ChartCard>
          </div>
        </>
      )}
    </>
  );
}

async function Weekly() {
  const weeks = await getWeeklyApplications();

  return (
    <WeeklyChart
      data={weeks.map((week) => ({
        label: formatShortDate(week.weekStart),
        count: week.count,
      }))}
    />
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

async function FollowUpPanel() {
  const items = await getFollowUpItems();

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        Tidak ada lamaran yang perlu ditindaklanjuti.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <Link
              href={`/applications/${item.id}`}
              className="font-medium break-words underline-offset-4 hover:underline"
            >
              {item.companyName}
              <span className="font-normal text-muted-foreground">
                {" · "}
                {item.position}
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-1">
              <StatusBadge status={item.status} />
              <FollowUpBadge followUp={item.followUp} />
            </div>
            <p className="text-xs text-muted-foreground">
              Follow-up terakhir:{" "}
              {item.lastFollowedUpAt
                ? formatDateTime(item.lastFollowedUpAt)
                : "belum pernah"}
            </p>
          </div>
          <FollowUpActions
            applicationId={item.id}
            suggestGhosted={item.followUp.suggestGhosted}
          />
        </li>
      ))}
    </ul>
  );
}
