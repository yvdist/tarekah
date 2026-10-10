import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { ApplicationStatus } from "@/db/schema/enum-values";

// An in-memory Postgres with the real migrations applied, for tests of SQL
// that cannot be checked without a database.
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, schema, casing: "snake_case" });

  await migrate(db, { migrationsFolder: "./drizzle" });

  return { db, close: () => client.close() };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];

export async function createUser(db: TestDb, name: string) {
  const [user] = await db
    .insert(schema.users)
    .values({ name, email: `${name}@example.com` })
    .returning({ id: schema.users.id });

  return user.id;
}

export async function createCv(db: TestDb, userId: string, label: string) {
  const [document] = await db
    .insert(schema.documents)
    .values({ userId, type: "cv", label })
    .returning({ id: schema.documents.id });

  return document.id;
}

type ApplicationFixture = {
  // Status events in order: [status, "YYYY-MM-DD" or full ISO timestamp].
  events: ReadonlyArray<readonly [ApplicationStatus, string]>;
  appliedAt?: string | null;
  source?: (typeof schema.applications.$inferInsert)["source"];
  cvDocumentId?: string | null;
};

const toDate = (value: string) =>
  new Date(value.length === 10 ? `${value}T00:00:00Z` : value);

// Writes an application the way the actions do: the row carries the last
// status, and every status it went through is an event.
export async function createApplication(
  db: TestDb,
  userId: string,
  fixture: ApplicationFixture,
) {
  const [company] = await db
    .insert(schema.companies)
    .values({ userId, name: `Perusahaan ${crypto.randomUUID()}` })
    .returning({ id: schema.companies.id });

  const last = fixture.events.at(-1);

  if (!last) {
    throw new Error("An application fixture needs at least one event");
  }

  const [application] = await db
    .insert(schema.applications)
    .values({
      userId,
      companyId: company.id,
      position: "Software Engineer",
      source: fixture.source ?? "linkedin",
      appliedAt: fixture.appliedAt ?? null,
      status: last[0],
      statusChangedAt: toDate(last[1]),
      cvDocumentId: fixture.cvDocumentId ?? null,
    })
    .returning({ id: schema.applications.id });

  await db.insert(schema.applicationStatusEvents).values(
    fixture.events.map(([toStatus, changedAt], index) => ({
      userId,
      applicationId: application.id,
      fromStatus: index === 0 ? null : fixture.events[index - 1][0],
      toStatus,
      changedAt: toDate(changedAt),
    })),
  );

  return application.id;
}

export async function createInterview(
  db: TestDb,
  userId: string,
  applicationId: string,
  overrides: Partial<typeof schema.interviews.$inferInsert> = {},
) {
  const [interview] = await db
    .insert(schema.interviews)
    .values({
      userId,
      applicationId,
      scheduledAt: new Date("2026-10-01T02:00:00Z"),
      stage: "technical",
      ...overrides,
    })
    .returning({ id: schema.interviews.id });

  return interview.id;
}

export async function createStory(
  db: TestDb,
  userId: string,
  title: string,
  competencies: (typeof schema.stories.$inferInsert)["competencies"] = [],
) {
  const [story] = await db
    .insert(schema.stories)
    .values({ userId, title, competencies })
    .returning({ id: schema.stories.id });

  return story.id;
}
