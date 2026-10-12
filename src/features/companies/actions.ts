"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { type ActionResult, invalidResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { companyFormSchema, companyIdSchema } from "./schemas";

const NOT_FOUND_MESSAGE = "Perusahaan tidak ditemukan.";

// Companies are created by the applications that name them; this fills in what
// an application cannot: the website and the user's own notes.
export async function updateCompany(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = companyIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const parsed = companyFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const updated = await db
    .update(companies)
    .set(parsed.data)
    .where(and(eq(companies.id, parsedId.data), eq(companies.userId, user.id)))
    .returning({ id: companies.id });

  if (updated.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`companies:${user.id}`);

  return { ok: true, data: undefined };
}
