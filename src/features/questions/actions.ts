"use server";

import { and, eq, notInArray } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { questions, questionStories } from "@/db/schema";
import { invalidResult, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { findOwnedApplicationId, findOwnedStoryIds } from "./data";
import {
  questionCategorySchema,
  questionFormSchema,
  questionIdSchema,
  questionReadinessSchema,
  questionStoryIdsSchema,
} from "./schemas";

const NOT_FOUND_MESSAGE = "Pertanyaan tidak ditemukan.";

export async function createQuestion(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = questionFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const referenceErrors = await checkApplication(
    user.id,
    parsed.data.applicationId,
  );

  if (referenceErrors) {
    return referenceErrors;
  }

  await db
    .insert(questions)
    .values({ ...parsed.data, userId: user.id, source: "manual" });

  updateTag(`questions:${user.id}`);

  return { ok: true, data: undefined };
}

// Edits the text, category, application and notes. The source and the link
// to an interview stay as they are.
export async function updateQuestion(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = questionIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const parsed = questionFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const referenceErrors = await checkApplication(
    user.id,
    parsed.data.applicationId,
  );

  if (referenceErrors) {
    return referenceErrors;
  }

  return setOwnQuestion(user.id, parsedId.data, parsed.data);
}

export async function setQuestionCategory(
  id: unknown,
  category: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ id: questionIdSchema, category: questionCategorySchema })
    .safeParse({ id, category });

  if (!parsed.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  return setOwnQuestion(user.id, parsed.data.id, {
    category: parsed.data.category,
  });
}

export async function setQuestionReadiness(
  id: unknown,
  readiness: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ id: questionIdSchema, readiness: questionReadinessSchema })
    .safeParse({ id, readiness });

  if (!parsed.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  return setOwnQuestion(user.id, parsed.data.id, {
    readiness: parsed.data.readiness,
  });
}

// Replaces the set of stories linked to a question.
export async function setQuestionStories(
  id: unknown,
  storyIds: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ id: questionIdSchema, storyIds: questionStoryIdsSchema })
    .safeParse({ id, storyIds });

  if (!parsed.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  // The foreign keys do not check ownership of either side.
  const [[question], owned] = await Promise.all([
    db
      .select({ id: questions.id })
      .from(questions)
      .where(
        and(eq(questions.id, parsed.data.id), eq(questions.userId, user.id)),
      )
      .limit(1),
    findOwnedStoryIds(db, user.id, parsed.data.storyIds),
  ]);

  if (!question) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  if (owned.length !== parsed.data.storyIds.length) {
    return { ok: false, message: "Ada cerita yang tidak ditemukan." };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(questionStories)
      .where(
        and(
          eq(questionStories.questionId, question.id),
          eq(questionStories.userId, user.id),
          owned.length > 0
            ? notInArray(questionStories.storyId, owned)
            : undefined,
        ),
      );

    if (owned.length > 0) {
      await tx
        .insert(questionStories)
        .values(
          owned.map((storyId) => ({
            questionId: question.id,
            storyId,
            userId: user.id,
          })),
        )
        .onConflictDoNothing();
    }
  });

  updateTag(`questions:${user.id}`);
  updateTag(`stories:${user.id}`);

  return { ok: true, data: undefined };
}

// Its story links go with it through ON DELETE CASCADE.
export async function deleteQuestion(id: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = questionIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const deleted = await db
    .delete(questions)
    .where(and(eq(questions.id, parsedId.data), eq(questions.userId, user.id)))
    .returning({ id: questions.id });

  if (deleted.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`questions:${user.id}`);
  updateTag(`stories:${user.id}`);

  return { ok: true, data: undefined };
}

async function setOwnQuestion(
  userId: string,
  id: string,
  values: Partial<typeof questions.$inferInsert>,
): Promise<ActionResult> {
  const updated = await db
    .update(questions)
    .set(values)
    .where(and(eq(questions.id, id), eq(questions.userId, userId)))
    .returning({ id: questions.id });

  if (updated.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`questions:${userId}`);

  return { ok: true, data: undefined };
}

// The foreign key does not check ownership.
async function checkApplication(
  userId: string,
  applicationId: string | null,
): Promise<ActionResult<never> | undefined> {
  if (!applicationId) {
    return undefined;
  }

  const owned = await findOwnedApplicationId(db, userId, applicationId);

  return owned
    ? undefined
    : {
        ok: false,
        message: "Periksa kembali isian form.",
        fieldErrors: { applicationId: ["Lamaran tidak ditemukan"] },
      };
}
