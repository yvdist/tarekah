"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { followUpSettingsSchema } from "./schemas";

export async function updateFollowUpSettings(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = followUpSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali isian form.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  await db
    .insert(userSettings)
    .values({ ...parsed.data, userId: user.id })
    .onConflictDoUpdate({ target: userSettings.userId, set: parsed.data });

  updateTag(`settings:${user.id}`);

  return { ok: true, data: undefined };
}
