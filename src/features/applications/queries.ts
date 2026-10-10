import "server-only";
import { and, asc, desc, eq, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  applications,
  applicationStatusEvents,
  companies,
  documents,
} from "@/db/schema";
import { getFollowUpSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth";
import { getFollowUpState, type FollowUpState } from "./follow-up";
import { applicationIdSchema } from "./schemas";

export type ApplicationListItem = Awaited<
  ReturnType<typeof listApplicationsByUserId>
>[number] & { followUp: FollowUpState };

export type ApplicationDetail = NonNullable<
  Awaited<ReturnType<typeof findApplicationByUserId>>
> & { followUp: FollowUpState };

export type ApplicationExportRow = Awaited<
  ReturnType<typeof listExportRowsByUserId>
>[number];

// The follow-up state depends on the clock, so it is worked out here, at
// request time and outside the cached list: it is neither cached nor
// recomputed on the client.
export async function getApplications(): Promise<ApplicationListItem[]> {
  const user = await requireUser();
  const [rows, settings] = await Promise.all([
    listApplicationsByUserId(user.id),
    getFollowUpSettings(),
  ]);
  const now = Date.now();

  return rows.map((row) => ({
    ...row,
    followUp: getFollowUpState(row, settings, now),
  }));
}

// Every application with all of its columns, oldest first, for the CSV export.
export async function getApplicationsForExport() {
  const user = await requireUser();

  return listExportRowsByUserId(user.id);
}

// Choices for linking something to an application, for example a contact.
export async function getApplicationOptions() {
  const user = await requireUser();
  const rows = await listApplicationsByUserId(user.id);

  return rows.map((row) => ({
    id: row.id,
    label: `${row.companyName} · ${row.position}`,
  }));
}

// Cards for the board, most recent status change first.
export async function getBoardItems() {
  const applications = await getApplications();

  return [...applications]
    .sort((a, b) => b.statusChangedAt.getTime() - a.statusChangedAt.getTime())
    .map((application) => ({
      id: application.id,
      companyName: application.companyName,
      position: application.position,
      source: application.source,
      status: application.status,
      followUp: application.followUp,
    }));
}

// Applications to chase or to give up on: ghosted suggestions first, then the
// longest wait.
export async function getFollowUpItems() {
  const applications = await getApplications();

  return applications
    .filter(({ followUp }) => followUp.needsFollowUp || followUp.suggestGhosted)
    .sort(
      (a, b) =>
        Number(b.followUp.suggestGhosted) - Number(a.followUp.suggestGhosted) ||
        b.followUp.daysSinceActivity - a.followUp.daysSinceActivity,
    );
}

// A row that does not exist or belongs to someone else is a 404 either way.
export async function getApplication(id: string): Promise<ApplicationDetail> {
  const user = await requireUser();
  const parsed = applicationIdSchema.safeParse(id);

  if (!parsed.success) {
    notFound();
  }

  const [application, settings] = await Promise.all([
    findApplicationByUserId(user.id, parsed.data),
    getFollowUpSettings(),
  ]);

  if (!application) {
    notFound();
  }

  return {
    ...application,
    followUp: getFollowUpState(application, settings, Date.now()),
  };
}

export async function getCompanyNames() {
  const user = await requireUser();

  return listCompanyNamesByUserId(user.id);
}

const cvDocuments = alias(documents, "cv_documents");
const coverLetterDocuments = alias(documents, "cover_letter_documents");

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
      lastFollowedUpAt: applications.lastFollowedUpAt,
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

async function listExportRowsByUserId(userId: string) {
  "use cache";
  cacheTag(
    `applications:${userId}`,
    `companies:${userId}`,
    `documents:${userId}`,
  );
  cacheLife("hours");

  return db
    .select({
      companyName: companies.name,
      position: applications.position,
      status: applications.status,
      source: applications.source,
      sourceDetail: applications.sourceDetail,
      workType: applications.workType,
      location: applications.location,
      salaryMin: applications.salaryMin,
      salaryMax: applications.salaryMax,
      salaryCurrency: applications.salaryCurrency,
      appliedAt: applications.appliedAt,
      statusChangedAt: applications.statusChangedAt,
      lastFollowedUpAt: applications.lastFollowedUpAt,
      cvLabel: cvDocuments.label,
      coverLetterLabel: coverLetterDocuments.label,
      jobUrl: applications.jobUrl,
      notes: applications.notes,
      jobDescription: applications.jobDescription,
      createdAt: applications.createdAt,
    })
    .from(applications)
    .innerJoin(
      companies,
      and(
        eq(companies.id, applications.companyId),
        eq(companies.userId, userId),
      ),
    )
    .leftJoin(
      cvDocuments,
      and(
        eq(cvDocuments.id, applications.cvDocumentId),
        eq(cvDocuments.userId, userId),
      ),
    )
    .leftJoin(
      coverLetterDocuments,
      and(
        eq(coverLetterDocuments.id, applications.coverLetterDocumentId),
        eq(coverLetterDocuments.userId, userId),
      ),
    )
    .where(eq(applications.userId, userId))
    .orderBy(asc(applications.createdAt));
}

async function findApplicationByUserId(userId: string, id: string) {
  "use cache";
  cacheTag(`applications:${userId}`);
  cacheLife("hours");

  const [application] = await db
    .select({
      ...getTableColumns(applications),
      companyName: companies.name,
      cvDocument: { label: cvDocuments.label, url: cvDocuments.url },
      coverLetterDocument: {
        label: coverLetterDocuments.label,
        url: coverLetterDocuments.url,
      },
    })
    .from(applications)
    .innerJoin(
      companies,
      and(
        eq(companies.id, applications.companyId),
        eq(companies.userId, userId),
      ),
    )
    .leftJoin(
      cvDocuments,
      and(
        eq(cvDocuments.id, applications.cvDocumentId),
        eq(cvDocuments.userId, userId),
      ),
    )
    .leftJoin(
      coverLetterDocuments,
      and(
        eq(coverLetterDocuments.id, applications.coverLetterDocumentId),
        eq(coverLetterDocuments.userId, userId),
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
