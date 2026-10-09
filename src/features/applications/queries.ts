import "server-only";
import { and, asc, desc, eq, getTableColumns } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { applications, applicationStatusEvents, companies } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { daysSince } from "./format";
import { applicationIdSchema } from "./schemas";

export type ApplicationListItem = Awaited<
  ReturnType<typeof listApplicationsByUserId>
>[number];

export type ApplicationDetail = NonNullable<
  Awaited<ReturnType<typeof findApplicationByUserId>>
>;

export async function getApplications() {
  const user = await requireUser();

  return listApplicationsByUserId(user.id);
}

// Cards for the board, most recent status change first. The day count is
// worked out here, at request time and outside the cached list, so it is
// neither cached nor recomputed on the client.
export async function getBoardItems() {
  const applications = await getApplications();
  const now = Date.now();

  return [...applications]
    .sort((a, b) => b.statusChangedAt.getTime() - a.statusChangedAt.getTime())
    .map((application) => ({
      id: application.id,
      companyName: application.companyName,
      position: application.position,
      source: application.source,
      status: application.status,
      daysInStatus: daysSince(application.statusChangedAt, now),
    }));
}

// A row that does not exist or belongs to someone else is a 404 either way.
export async function getApplication(id: string) {
  const user = await requireUser();
  const parsed = applicationIdSchema.safeParse(id);

  if (!parsed.success) {
    notFound();
  }

  const application = await findApplicationByUserId(user.id, parsed.data);

  if (!application) {
    notFound();
  }

  return application;
}

export async function getCompanyNames() {
  const user = await requireUser();

  return listCompanyNamesByUserId(user.id);
}

// The cached functions below stay unexported: taking a userId argument, they
// must only be reachable through the session-resolving functions above.

async function listApplicationsByUserId(userId: string) {
  "use cache";
  cacheTag(`applications:${userId}`);
  cacheLife("hours");

  return db
    .select({
      id: applications.id,
      companyName: companies.name,
      position: applications.position,
      status: applications.status,
      statusChangedAt: applications.statusChangedAt,
      source: applications.source,
      workType: applications.workType,
      location: applications.location,
      appliedAt: applications.appliedAt,
    })
    .from(applications)
    .innerJoin(
      companies,
      and(
        eq(companies.id, applications.companyId),
        eq(companies.userId, userId),
      ),
    )
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt));
}

async function findApplicationByUserId(userId: string, id: string) {
  "use cache";
  cacheTag(`applications:${userId}`);
  cacheLife("hours");

  const [application] = await db
    .select({
      ...getTableColumns(applications),
      companyName: companies.name,
    })
    .from(applications)
    .innerJoin(
      companies,
      and(
        eq(companies.id, applications.companyId),
        eq(companies.userId, userId),
      ),
    )
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1);

  if (!application) {
    return null;
  }

  const statusEvents = await db
    .select({
      id: applicationStatusEvents.id,
      fromStatus: applicationStatusEvents.fromStatus,
      toStatus: applicationStatusEvents.toStatus,
      changedAt: applicationStatusEvents.changedAt,
      note: applicationStatusEvents.note,
    })
    .from(applicationStatusEvents)
    .where(
      and(
        eq(applicationStatusEvents.applicationId, id),
        eq(applicationStatusEvents.userId, userId),
      ),
    )
    .orderBy(
      desc(applicationStatusEvents.changedAt),
      desc(applicationStatusEvents.createdAt),
    );

  return { ...application, statusEvents };
}

async function listCompanyNamesByUserId(userId: string) {
  "use cache";
  cacheTag(`companies:${userId}`);
  cacheLife("hours");

  const rows = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.userId, userId))
    .orderBy(asc(companies.name));

  return rows.map((row) => row.name);
}
