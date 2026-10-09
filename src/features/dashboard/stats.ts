import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/db/schema";
import { applications, applicationStatusEvents, documents } from "@/db/schema";
import type { ApplicationStatus } from "@/db/schema/enum-values";
import { FOLLOW_UP_STATUSES } from "@/features/applications/follow-up";

// The SQL behind the dashboard. The database is passed in rather than
// imported, so the same queries run against the pool in queries.ts and against
// an in-memory Postgres in tests. Callers own authorization and caching.
type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

// The pipeline in order. An application's stage is the furthest of these it
// ever reached, whatever its status is now.
export const FUNNEL_STAGES = [
  "applied",
  "screening",
  "technical_test",
  "interview",
  "offer",
] as const satisfies readonly ApplicationStatus[];

// Statuses that mean the company answered. Ghosted is the absence of one.
const RESPONSE_STATUSES = [
  "screening",
  "technical_test",
  "interview",
  "offer",
  "rejected",
] as const satisfies readonly ApplicationStatus[];

const INTERVIEW_STAGE = 4;
const OFFER_STAGE = 5;
const WEEKS_SHOWN = 12;

const countWhere = (condition: SQL) =>
  sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

// Percentage with one decimal, or null when nothing was sent.
const percentage = (numerator: SQL, denominator: SQL) =>
  sql<
    number | null
  >`round(100.0 * ${numerator} / nullif(${denominator}, 0), 1)`.mapWith(Number);

export async function queryStats(
  db: Database,
  userId: string,
  from: string | null,
  to: string | null,
) {
  const inRange = and(
    eq(applications.userId, userId),
    from ? gte(applications.appliedAt, from) : undefined,
    to ? lte(applications.appliedAt, to) : undefined,
  );

  // One row per application in the range. Rejected and ghosted count as stage
  // 1: the application was sent, even if it was recorded without ever passing
  // through "applied".
  const perApplication = db.$with("per_application").as(
    db
      .select({
        source: applications.source,
        cvDocumentId: applications.cvDocumentId,
        status: applications.status,
        stage: sql<number>`coalesce(max(case ${applicationStatusEvents.toStatus}
          when 'wishlist' then 0
          when 'screening' then 2
          when 'technical_test' then 3
          when 'interview' then 4
          when 'offer' then 5
          else 1
        end), 0)`.as("stage"),
        responded: sql<boolean>`coalesce(bool_or(${inArray(
          applicationStatusEvents.toStatus,
          RESPONSE_STATUSES,
        )}), false)`.as("responded"),
      })
      .from(applications)
      .leftJoin(
        applicationStatusEvents,
        and(
          eq(applicationStatusEvents.applicationId, applications.id),
          eq(applicationStatusEvents.userId, userId),
        ),
      )
      .where(inRange)
      .groupBy(applications.id),
  );

  const reached = (stage: number) => sql`${perApplication.stage} >= ${stage}`;
  const submitted = countWhere(reached(1));
  const responded = countWhere(sql`${perApplication.responded}`);
  const interviewed = countWhere(reached(INTERVIEW_STAGE));
  const rates = {
    submitted,
    responded,
    interviewed,
    responseRate: percentage(responded, submitted),
    interviewRate: percentage(interviewed, submitted),
  };

  // First move into "applied" per application, then the first answer after it.
  const firstApplied = db.$with("first_applied").as(
    db
      .select({
        applicationId: applicationStatusEvents.applicationId,
        appliedTime: sql<Date>`min(${applicationStatusEvents.changedAt})`.as(
          "applied_time",
        ),
      })
      .from(applicationStatusEvents)
      .innerJoin(
        applications,
        eq(applications.id, applicationStatusEvents.applicationId),
      )
      .where(
        and(
          eq(applicationStatusEvents.userId, userId),
          eq(applicationStatusEvents.toStatus, "applied"),
          inRange,
        ),
      )
      .groupBy(applicationStatusEvents.applicationId),
  );

  const responseTime = db.$with("response_time").as(
    db
      .select({
        days: sql<number>`extract(epoch from min(${applicationStatusEvents.changedAt}) - ${firstApplied.appliedTime}) / 86400.0`.as(
          "days",
        ),
      })
      .from(firstApplied)
      .innerJoin(
        applicationStatusEvents,
        and(
          eq(applicationStatusEvents.applicationId, firstApplied.applicationId),
          eq(applicationStatusEvents.userId, userId),
          inArray(applicationStatusEvents.toStatus, RESPONSE_STATUSES),
          gt(applicationStatusEvents.changedAt, firstApplied.appliedTime),
        ),
      )
      .groupBy(firstApplied.applicationId, firstApplied.appliedTime),
  );

  const [[summary], bySource, byCv, [response]] = await Promise.all([
    db
      .with(perApplication)
      .select({
        total: count(),
        active: countWhere(inArray(perApplication.status, FOLLOW_UP_STATUSES)),
        offers: countWhere(reached(OFFER_STAGE)),
        ...rates,
        applied: submitted,
        screening: countWhere(reached(2)),
        technicalTest: countWhere(reached(3)),
      })
      .from(perApplication),
    db
      .with(perApplication)
      .select({ source: perApplication.source, ...rates })
      .from(perApplication)
      .groupBy(perApplication.source)
      .having(sql`${submitted} > 0`)
      .orderBy(desc(submitted), asc(perApplication.source)),
    db
      .with(perApplication)
      .select({
        id: documents.id,
        label: documents.label,
        isArchived: documents.isArchived,
        ...rates,
      })
      .from(perApplication)
      .leftJoin(
        documents,
        and(
          eq(documents.id, perApplication.cvDocumentId),
          eq(documents.userId, userId),
        ),
      )
      .groupBy(documents.id)
      .having(sql`${submitted} > 0`)
      .orderBy(sql`${documents.label} asc nulls last`),
    db
      .with(firstApplied, responseTime)
      .select({
        averageDays: sql<
          number | null
        >`round(avg(${responseTime.days})::numeric, 1)`.mapWith(Number),
        sample: count(),
      })
      .from(responseTime),
  ]);

  return {
    summary: {
      total: summary.total,
      active: summary.active,
      interviews: summary.interviewed,
      offers: summary.offers,
      submitted: summary.submitted,
      responded: summary.responded,
      responseRate: summary.responseRate,
    },
    funnel: [
      { stage: FUNNEL_STAGES[0], count: summary.applied },
      { stage: FUNNEL_STAGES[1], count: summary.screening },
      { stage: FUNNEL_STAGES[2], count: summary.technicalTest },
      { stage: FUNNEL_STAGES[3], count: summary.interviewed },
      { stage: FUNNEL_STAGES[4], count: summary.offers },
    ],
    bySource,
    byCv,
    responseTime: response,
  };
}

export async function queryWeekly(db: Database, userId: string, today: string) {
  const thisWeek = sql`date_trunc('week', ${today}::timestamp)`;
  const span = sql.raw(`interval '${WEEKS_SHOWN - 1} weeks'`);
  const weeks = sql`generate_series(
    ${thisWeek} - ${span},
    ${thisWeek},
    interval '1 week'
  ) as weeks(week_start)`;

  // Weeks start on Monday. generate_series keeps the weeks with no rows.
  return db
    .select({
      weekStart: sql<string>`to_char(weeks.week_start, 'YYYY-MM-DD')`,
      count: count(applications.id),
    })
    .from(weeks)
    .leftJoin(
      applications,
      and(
        eq(applications.userId, userId),
        sql`${applications.appliedAt} >= weeks.week_start::date`,
        sql`${applications.appliedAt} < weeks.week_start::date + 7`,
      ),
    )
    .groupBy(sql`weeks.week_start`)
    .orderBy(sql`weeks.week_start`);
}
