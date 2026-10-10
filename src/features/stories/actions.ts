"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { stories } from "@/db/schema";
import { invalidResult, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { storyFormSchema, storyIdSchema } from "./schemas";

const NOT_FOUND_MESSAGE = "Cerita tidak ditemukan.";

export async function createStory(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = storyFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const [story] = await db
    .insert(stories)
    .values({ ...parsed.data, userId: user.id })
    .returning({ id: stories.id });

  updateTag(`stories:${user.id}`);

  return { ok: true, data: { id: story.id } };
}

export async function updateStory(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = storyIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const parsed = storyFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const updated = await db
    .update(stories)
    .set(parsed.data)
    .where(and(eq(stories.id, parsedId.data), eq(stories.userId, user.id)))
    .returning({ id: stories.id });

  if (updated.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  refresh(user.id);

  return { ok: true, data: undefined };
}

// Its question links go with it through ON DELETE CASCADE.
export async function deleteStory(id: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = storyIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const deleted = await db
    .delete(stories)
    .where(and(eq(stories.id, parsedId.data), eq(stories.userId, user.id)))
    .returning({ id: stories.id });

  if (deleted.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  refresh(user.id);

  return { ok: true, data: undefined };
}

// Question rows show the titles of their stories.
function refresh(userId: string) {
  updateTag(`stories:${userId}`);
  updateTag(`questions:${userId}`);
}
