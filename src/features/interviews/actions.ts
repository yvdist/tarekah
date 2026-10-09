"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { applications, interviews } from "@/db/schema";
import { applicationIdSchema } from "@/features/applications/schemas";
import { invalidResult, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { interviewFormSchema, interviewIdSchema } from "./schemas";

const NOT_FOUND_MESSAGE = "Interview tidak ditemukan.";

export async function createInterview(
  applicationId: unknown,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = applicationIdSchema.safeParse(applicationId);

  if (!parsedId.success) {
    return { ok: false, message: "Lamaran tidak ditemukan." };
  }

  const parsed = interviewFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  // The foreign key does not check ownership.
  const [application] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(eq(applications.id, parsedId.data), eq(applications.userId, user.id)),
    )
    .limit(1);

  if (!application) {
    return { ok: false, message: "Lamaran tidak ditemukan." };
  }

  await db.insert(interviews).values({
    ...parsed.data,
    userId: user.id,
    applicationId: application.id,
  });

  updateTag(`interviews:${user.id}`);

  return { ok: true, data: undefined };
}

export async function updateInterview(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = interviewIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const parsed = interviewFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const updated = await db
    .update(interviews)
    .set(parsed.data)
    .where(
      and(eq(interviews.id, parsedId.data), eq(interviews.userId, user.id)),
    )
    .returning({ id: interviews.id });

  if (updated.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`interviews:${user.id}`);

  return { ok: true, data: undefined };
}

export async function deleteInterview(id: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = interviewIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const deleted = await db
    .delete(interviews)
    .where(
      and(eq(interviews.id, parsedId.data), eq(interviews.userId, user.id)),
    )
    .returning({ id: interviews.id });

  if (deleted.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`interviews:${user.id}`);

  return { ok: true, data: undefined };
}
