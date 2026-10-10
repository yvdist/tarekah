"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { applications, interviews } from "@/db/schema";
import { applicationIdSchema } from "@/features/applications/schemas";
import { syncInterviewQuestions } from "@/features/questions/data";
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

  const { questions, ...values } = parsed.data;

  // The interview and its questions are written together.
  await db.transaction(async (tx) => {
    const [interview] = await tx
      .insert(interviews)
      .values({ ...values, userId: user.id, applicationId: application.id })
      .returning({ id: interviews.id });

    await syncInterviewQuestions(
      tx,
      user.id,
      { id: interview.id, applicationId: application.id },
      // A new interview has no existing questions, so every row is fresh.
      questions.map(({ text }) => ({ id: null, text })),
    );
  });

  refresh(user.id);

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

  const { questions, ...values } = parsed.data;

  const found = await db.transaction(async (tx) => {
    const [interview] = await tx
      .update(interviews)
      .set(values)
      .where(
        and(eq(interviews.id, parsedId.data), eq(interviews.userId, user.id)),
      )
      .returning({
        id: interviews.id,
        applicationId: interviews.applicationId,
      });

    if (!interview) {
      return false;
    }

    await syncInterviewQuestions(tx, user.id, interview, questions);

    return true;
  });

  if (!found) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  refresh(user.id);

  return { ok: true, data: undefined };
}

// Its questions stay in the bank; only their link to the interview is cleared
// (ON DELETE SET NULL).
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

  refresh(user.id);

  return { ok: true, data: undefined };
}

// Every change here touches both the interview and the question bank.
function refresh(userId: string) {
  updateTag(`interviews:${userId}`);
  updateTag(`questions:${userId}`);
}
