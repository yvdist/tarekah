import { Bell, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  ChartSkeleton,
  ListSkeleton,
  StatsSkeleton,
} from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowUpActions } from "@/features/applications/components/follow-up-actions";
import { FollowUpBadge } from "@/features/applications/components/follow-up-badge";
import { StatusBadge } from "@/features/applications/components/status-badge";
import { isFollowUpStatus } from "@/features/applications/follow-up";
import { formatDateTime } from "@/features/applications/format";
import { SOURCE_LABELS, STATUS_LABELS } from "@/features/applications/labels";
import {
  getBoardItems,
  getFollowUpItems,
} from "@/features/applications/queries";
import { Panel } from "@/features/dashboard/components/panel";
import { RangeFilter } from "@/features/dashboard/components/range-filter";
import { RateBreakdown } from "@/features/dashboard/components/rate-breakdown";
import { StepPath } from "@/features/dashboard/components/step-path";
import {
  ResponseStats,
  SummaryCards,
} from "@/features/dashboard/components/summary-cards";
import { WeeklyChart } from "@/features/dashboard/components/weekly-chart";
import { formatShortDate } from "@/features/dashboard/format";
import {
  formatLongDate,
  greetingFor,
  hourInJakarta,
} from "@/features/dashboard/greeting";
import {
  getDashboardStats,
  getWeeklyApplications,
} from "@/features/dashboard/queries";
import { resolveCurrentRange } from "@/features/dashboard/range";

export const metadata: Metadata = { title: "Dashboard" };

type SearchParams = Pick<PageProps<"/dashboard">, "searchParams">;

// How many companies the banner names before it says "and N more".
const BANNER_NAMES = 3;

export default function DashboardPage({ searchParams }: SearchParams) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <p className="font-figure text-xs text-muted-foreground">
            <Suspense fallback={<>&nbsp;</>}>
              <Today />
            </Suspense>
          </p>
        }
        // The page is still called Dashboard; the greeting is what shows.
        title={
          <>
            <span className="sr-only">Dashboard. </span>
            <Suspense fallback={<>&nbsp;</>}>
              <Greeting />
            </Suspense>
          </>
        }
        description={
          <Suspense fallback={<Skeleton className="h-5 w-64" />}>
            <TodaySummary />
          </Suspense>
        }
        actions={
          <Link
            href="/applications/new"
            className={buttonVariants({ size: "lg" })}
          >
            <Plus />
            Tambah lamaran
          </Link>
        }
      />
      <Suspense fallback={null}>
        <FollowUpBanner />
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <Statistics searchParams={searchParams} />
      </Suspense>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Lamaran per minggu"
          hint="12 minggu terakhir · tidak mengikuti filter"
        >
          <Suspense fallback={<ChartSkeleton />}>
            <Weekly />
          </Suspense>
        </Panel>
        <Panel
          id="follow-up"
          title="Perlu follow-up"
          hint="Yang paling lama menunggu di atas"
        >
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <FollowUpList />
          </Suspense>
        </Panel>
      </div>
      <Suspense fallback={null}>
        <ResponseBreakdown searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// The clock is request-time data: connection() says so, and each of these
// renders behind its own boundary.
async function Today() {
  await connection();

  return formatLongDate(Date.now());
}

async function Greeting() {
  await connection();

  return greetingFor(hourInJakarta(Date.now()));
}

async function TodaySummary() {
  const items = await getBoardItems();

  if (items.length === 0) {
    return <p>Belum ada lamaran yang dicatat.</p>;
  }

  const active = items.filter((item) => isFollowUpStatus(item.status)).length;
  const waiting = items.filter(
    ({ followUp }) => followUp.needsFollowUp || followUp.suggestGhosted,
  ).length;

  return (
    <p>
      {active} lamaran aktif
      {waiting > 0 ? ` · ${waiting} menunggu disapa lagi` : null}
    </p>
  );
}

async function FollowUpBanner() {
  const items = await getFollowUpItems();

  if (items.length === 0) {
    return null;
  }

  const names = items.slice(0, BANNER_NAMES).map((item) => item.companyName);
  const rest = items.length - names.length;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-warning px-4 py-3 text-sm">
      <Bell aria-hidden className="size-4 shrink-0 text-kunyit-tua" />
      <p className="min-w-0 flex-1 basis-56">
        {items.length} lamaran sudah lewat batas follow-up: {names.join(", ")}
        {rest > 0 ? `, dan ${rest} lainnya` : null}.
      </p>
      <a
        href="#follow-up"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Lihat
      </a>
    </div>
  );
}

// searchParams is request-time data, so it is read behind the boundary.
async function Statistics({ searchParams }: SearchParams) {
  const range = await resolveCurrentRange(await searchParams);
  const stats = await getDashboardStats(range);

  return (
    <>
      <RangeFilter range={range} />
      {stats.summary.total === 0 ? (
        range.preset === "all" ? (
          <EmptyState
            title="Mulai léngkah pertamamu"
            description="Catat lamaran pertama, sekecil apa pun. Ringkasan dan jalurnya muncul di sini."
          >
            <Link
              href="/applications/new"
              className={buttonVariants({ variant: "outline" })}
            >
              Catat lamaran pertama
            </Link>
          </EmptyState>
        ) : (
          <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            Tidak ada lamaran dengan tanggal apply pada rentang ini.
          </p>
        )
      ) : (
        <>
          <SummaryCards summary={stats.summary} />
          <Panel
            title="Jalur léngkah"
            hint="Berapa lamaran yang sampai di tiap tahap"
          >
            <StepPath
              stages={stats.funnel.map((row) => ({
                ...row,
                label: STATUS_LABELS[row.stage],
              }))}
            />
          </Panel>
        </>
      )}
    </>
  );
}

// Same range and same cached statistics as above, further down the page.
async function ResponseBreakdown({ searchParams }: SearchParams) {
  const range = await resolveCurrentRange(await searchParams);
  const stats = await getDashboardStats(range);

  if (stats.summary.total === 0) {
    return null;
  }

  const hint = "Yang direspons dan yang sampai interview";

  return (
    <>
      <ResponseStats
        summary={stats.summary}
        responseTime={stats.responseTime}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Per sumber loker" hint={hint}>
          <RateBreakdown
            dimension="Sumber"
            rows={stats.bySource.map((row) => ({
              ...row,
              key: row.source,
              label: SOURCE_LABELS[row.source],
            }))}
          />
        </Panel>
        <Panel title="Per versi CV" hint={hint}>
          <RateBreakdown
            dimension="Versi CV"
            rows={stats.byCv.map((row) => ({
              ...row,
              key: row.id ?? "none",
              label: row.label ?? "Tanpa CV",
            }))}
          />
        </Panel>
      </div>
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

async function FollowUpList() {
  const items = await getFollowUpItems();

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Tidak ada yang perlu disapa lagi. Semua masih dalam batas waktu.
      </p>
    );
  }

  return (
    // Next to the chart the list takes the chart's height and scrolls inside
    // it: with a basis of 0 it adds nothing to the row. Stacked, it is capped.
    <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2 max-lg:max-h-[28rem] lg:basis-0">
      <ul className="divide-y">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
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
    </div>
  );
}
