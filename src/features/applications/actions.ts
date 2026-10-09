"use server";

import { and, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { applications, applicationStatusEvents, companies } from "@/db/schema";
import type { ApplicationStatus } from "@/db/schema/enum-values";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import {
  applicationFormSchema,
  applicationIdSchema,
  applicationStatusSchema,
} from "./schemas";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const NOT_FOUND_MESSAGE = "Lamaran tidak ditemukan.";
const INVALID_MESSAGE = "Periksa kembali isian form.";

export async function createApplication(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = applicationFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalid(parsed.error);
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
    return invalid(parsed.error);
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

  updateTag(`applications:${user.id}`);

  if (parsedOptions.success && parsedOptions.data?.redirectToList) {
    redirect("/applications");
  }

  return { ok: true, data: undefined };
}

function invalid(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    message: INVALID_MESSAGE,
    fieldErrors: z.flattenError(error).fieldErrors,
  };
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
