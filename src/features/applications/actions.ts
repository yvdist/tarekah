"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  applications,
  applicationStatusEvents,
  companies,
  documents,
} from "@/db/schema";
import type { ApplicationStatus, DocumentType } from "@/db/schema/enum-values";
import { invalidResult, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { FOLLOW_UP_STATUSES } from "./follow-up";
import {
  applicationFormSchema,
  applicationIdSchema,
  applicationStatusSchema,
} from "./schemas";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const NOT_FOUND_MESSAGE = "Lamaran tidak ditemukan.";

export async function createApplication(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = applicationFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const documentErrors = await checkDocuments(user.id, parsed.data);

  if (documentErrors) {
    return documentErrors;
  }

  const { companyName, ...values } = parsed.data;

  const created = await db.transaction(async (tx) => {
    const company = await findOrCreateCompany(tx, user.id, companyName);
    const now = new Date();

    const [application] = await tx
      .insert(applications)
      .values({
        ...values,
        userId: user.id,
        companyId: company.id,
        statusChangedAt: now,
      })
      .returning({ id: applications.id });

    await tx.insert(applicationStatusEvents).values({
      userId: user.id,
      applicationId: application.id,
      fromStatus: null,
      toStatus: values.status,
      changedAt: now,
    });

    return { id: application.id, companyCreated: company.created };
  });

  updateTag(`applications:${user.id}`);
  if (created.companyCreated) {
    updateTag(`companies:${user.id}`);
  }

  return { ok: true, data: { id: created.id } };
}

export async function updateApplication(
  id: unknown,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsedId = applicationIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const parsed = applicationFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const documentErrors = await checkDocuments(user.id, parsed.data);

  if (documentErrors) {
    return documentErrors;
  }

  const { companyName, ...values } = parsed.data;

  const updated = await db.transaction(async (tx) => {
    const current = await lockApplication(tx, user.id, parsedId.data);

    if (!current) {
      return null;
    }

    const company = await findOrCreateCompany(tx, user.id, companyName);

    await tx
      .update(applications)
      .set({
        ...values,
        companyId: company.id,
        ...(await recordStatusChange(tx, user.id, current, values.status)),
      })
      .where(
        and(eq(applications.id, current.id), eq(applications.userId, user.id)),
      );

    return { companyCreated: company.created };
  });

  if (!updated) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`applications:${user.id}`);
  if (updated.companyCreated) {
    updateTag(`companies:${user.id}`);
  }

  return { ok: true, data: { id: parsedId.data } };
}

export async function changeApplicationStatus(
  id: unknown,
  status: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ id: applicationIdSchema, status: applicationStatusSchema })
    .safeParse({ id, status });

  if (!parsed.success) {
    return { ok: false, message: "Status tidak valid." };
  }

  const found = await db.transaction(async (tx) => {
    const current = await lockApplication(tx, user.id, parsed.data.id);

    if (!current) {
      return false;
    }

    const change = await recordStatusChange(
      tx,
      user.id,
      current,
      parsed.data.status,
    );

    if (change) {
      await tx
        .update(applications)
        .set(change)
        .where(
          and(
            eq(applications.id, current.id),
            eq(applications.userId, user.id),
          ),
        );
    }

    return true;
  });

  if (!found) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`applications:${user.id}`);

  return { ok: true, data: undefined };
}

// Restarts the follow-up count. Only applications that are waiting on the
// company can be followed up; anything else is treated as not found.
export async function markFollowedUp(id: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = applicationIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const updated = await db
    .update(applications)
    .set({ lastFollowedUpAt: new Date() })
    .where(
      and(
        eq(applications.id, parsedId.data),
        eq(applications.userId, user.id),
        inArray(applications.status, FOLLOW_UP_STATUSES),
      ),
    )
    .returning({ id: applications.id });

  if (updated.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`applications:${user.id}`);

  return { ok: true, data: undefined };
}

// With redirectToList the action navigates to the list itself on success, so
// the page of the deleted application is never re-rendered. Failures are still
// returned as data.
export async function deleteApplication(
  id: unknown,
  options?: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = applicationIdSchema.safeParse(id);
  const parsedOptions = z
    .object({ redirectToList: z.boolean() })
    .optional()
    .safeParse(options);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  // Status events go with it through ON DELETE CASCADE.
  const deleted = await db
    .delete(applications)
    .where(
      and(eq(applications.id, parsedId.data), eq(applications.userId, user.id)),
    )
    .returning({ id: applications.id });

  if (deleted.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  // Interviews and contact links go with it through ON DELETE CASCADE;
  // questions stay but lose their link to it (ON DELETE SET NULL).
  updateTag(`applications:${user.id}`);
  updateTag(`interviews:${user.id}`);
  updateTag(`contacts:${user.id}`);
  updateTag(`questions:${user.id}`);

  if (parsedOptions.success && parsedOptions.data?.redirectToList) {
    redirect("/applications");
  }

  return { ok: true, data: undefined };
}

// The foreign keys do not check ownership, so a chosen version must belong to
// this user and be of the type its column expects.
async function checkDocuments(
  userId: string,
  values: { cvDocumentId: string | null; coverLetterDocumentId: string | null },
): Promise<ActionResult<never> | undefined> {
  const fieldErrors: Record<string, string[]> = {};
  const checks: Array<[keyof typeof values, DocumentType]> = [
    ["cvDocumentId", "cv"],
    ["coverLetterDocumentId", "cover_letter"],
  ];

  for (const [field, type] of checks) {
    const id = values[field];

    if (id && !(await ownsDocument(userId, id, type))) {
      fieldErrors[field] = ["Versi dokumen tidak ditemukan"];
    }
  }

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, message: "Periksa kembali isian form.", fieldErrors }
    : undefined;
}

async function ownsDocument(userId: string, id: string, type: DocumentType) {
  const [document] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.id, id),
        eq(documents.userId, userId),
        eq(documents.type, type),
      ),
    )
    .limit(1);

  return document !== undefined;
}

// Companies are unique per user on lower(name), so the name typed in the form
// either matches an existing company of this user or creates one.
async function findOrCreateCompany(
  tx: Transaction,
  userId: string,
  name: string,
) {
  const [inserted] = await tx
    .insert(companies)
    .values({ userId, name })
    .onConflictDoNothing()
    .returning({ id: companies.id });

  if (inserted) {
    return { id: inserted.id, created: true };
  }

  const [existing] = await tx
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(
        eq(companies.userId, userId),
        sql`lower(${companies.name}) = lower(${name})`,
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error("Company could not be created or found");
  }

  return { id: existing.id, created: false };
}

// Row lock, so two concurrent status changes cannot both read the same
// "from" status.
async function lockApplication(tx: Transaction, userId: string, id: string) {
  const [current] = await tx
    .select({ id: applications.id, status: applications.status })
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .for("update");

  return current;
}

// Writes the history row and returns the matching columns for applications.
// Must run in the same transaction as the update that applies them.
async function recordStatusChange(
  tx: Transaction,
  userId: string,
  current: { id: string; status: ApplicationStatus },
  nextStatus: ApplicationStatus,
) {
  if (current.status === nextStatus) {
    return undefined;
  }

  const now = new Date();

  await tx.insert(applicationStatusEvents).values({
    userId,
    applicationId: current.id,
    fromStatus: current.status,
    toStatus: nextStatus,
    changedAt: now,
  });

  return { status: nextStatus, statusChangedAt: now };
}
