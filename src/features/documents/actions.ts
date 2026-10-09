"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { invalidResult, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { documentFormSchema, documentIdSchema } from "./schemas";

const NOT_FOUND_MESSAGE = "Dokumen tidak ditemukan.";

// Mirrors documents_user_id_type_label_unique.
const DUPLICATE_LABEL: ActionResult<never> = {
  ok: false,
  message: "Periksa kembali isian form.",
  fieldErrors: { label: ["Nama versi sudah dipakai untuk jenis ini"] },
};

export async function createDocument(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = documentFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  try {
    await db.insert(documents).values({ ...parsed.data, userId: user.id });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return DUPLICATE_LABEL;
    }

    throw error;
  }

  updateTag(`documents:${user.id}`);

  return { ok: true, data: undefined };
}

export async function updateDocument(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = documentIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const parsed = documentFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  // The type is fixed once created: applications reference a version through
  // a column that is specific to its type.
  const { label, url, notes } = parsed.data;
  let updated;

  try {
    updated = await db
      .update(documents)
      .set({ label, url, notes })
      .where(
        and(eq(documents.id, parsedId.data), eq(documents.userId, user.id)),
      )
      .returning({ id: documents.id });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return DUPLICATE_LABEL;
    }

    throw error;
  }

  if (updated.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  refresh(user.id);

  return { ok: true, data: undefined };
}

export async function setDocumentArchived(
  id: unknown,
  isArchived: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ id: documentIdSchema, isArchived: z.boolean() })
    .safeParse({ id, isArchived });

  if (!parsed.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const updated = await db
    .update(documents)
    .set({ isArchived: parsed.data.isArchived })
    .where(and(eq(documents.id, parsed.data.id), eq(documents.userId, user.id)))
    .returning({ id: documents.id });

  if (updated.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  refresh(user.id);

  return { ok: true, data: undefined };
}

// Applications that used the version keep existing; their reference is
// cleared through ON DELETE SET NULL.
export async function deleteDocument(id: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = documentIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const deleted = await db
    .delete(documents)
    .where(and(eq(documents.id, parsedId.data), eq(documents.userId, user.id)))
    .returning({ id: documents.id });

  if (deleted.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  refresh(user.id);

  return { ok: true, data: undefined };
}

// Application pages show the label and link of the versions they use.
function refresh(userId: string) {
  updateTag(`documents:${userId}`);
  updateTag(`applications:${userId}`);
}
