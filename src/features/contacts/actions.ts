"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  applicationContacts,
  applications,
  companies,
  contacts,
} from "@/db/schema";
import { applicationIdSchema } from "@/features/applications/schemas";
import { invalidResult, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import {
  contactFormSchema,
  contactIdSchema,
  type ContactFormValues,
} from "./schemas";

const NOT_FOUND_MESSAGE = "Kontak tidak ditemukan.";

const linkSchema = z.object({
  applicationId: applicationIdSchema,
  contactId: contactIdSchema,
});

export async function createContact(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = contactFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const referenceErrors = await checkReferences(user.id, parsed.data);

  if (referenceErrors) {
    return referenceErrors;
  }

  const { applicationIds, ...values } = parsed.data;

  await db.transaction(async (tx) => {
    const [contact] = await tx
      .insert(contacts)
      .values({ ...values, userId: user.id })
      .returning({ id: contacts.id });

    if (applicationIds.length > 0) {
      await tx.insert(applicationContacts).values(
        applicationIds.map((applicationId) => ({
          applicationId,
          contactId: contact.id,
          userId: user.id,
        })),
      );
    }
  });

  updateTag(`contacts:${user.id}`);

  return { ok: true, data: undefined };
}

export async function updateContact(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = contactIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const parsed = contactFormSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(parsed.error);
  }

  const referenceErrors = await checkReferences(user.id, parsed.data);

  if (referenceErrors) {
    return referenceErrors;
  }

  const { applicationIds, ...values } = parsed.data;

  // The contact and its links change together.
  const found = await db.transaction(async (tx) => {
    const [contact] = await tx
      .update(contacts)
      .set(values)
      .where(and(eq(contacts.id, parsedId.data), eq(contacts.userId, user.id)))
      .returning({ id: contacts.id });

    if (!contact) {
      return false;
    }

    await tx
      .delete(applicationContacts)
      .where(
        and(
          eq(applicationContacts.contactId, contact.id),
          eq(applicationContacts.userId, user.id),
          applicationIds.length > 0
            ? notInArray(applicationContacts.applicationId, applicationIds)
            : undefined,
        ),
      );

    if (applicationIds.length > 0) {
      await tx
        .insert(applicationContacts)
        .values(
          applicationIds.map((applicationId) => ({
            applicationId,
            contactId: contact.id,
            userId: user.id,
          })),
        )
        .onConflictDoNothing();
    }

    return true;
  });

  if (!found) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`contacts:${user.id}`);

  return { ok: true, data: undefined };
}

// Links to applications go with it through ON DELETE CASCADE.
export async function deleteContact(id: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = contactIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  const deleted = await db
    .delete(contacts)
    .where(and(eq(contacts.id, parsedId.data), eq(contacts.userId, user.id)))
    .returning({ id: contacts.id });

  if (deleted.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  updateTag(`contacts:${user.id}`);

  return { ok: true, data: undefined };
}

export async function linkContact(
  applicationId: unknown,
  contactId: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = linkSchema.safeParse({ applicationId, contactId });

  if (!parsed.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  // The foreign keys do not check ownership of either side.
  const [[contact], ownedApplications] = await Promise.all([
    db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, parsed.data.contactId),
          eq(contacts.userId, user.id),
        ),
      )
      .limit(1),
    findOwnedApplicationIds(user.id, [parsed.data.applicationId]),
  ]);

  if (!contact || ownedApplications.length === 0) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  await db
    .insert(applicationContacts)
    .values({ ...parsed.data, userId: user.id })
    .onConflictDoNothing();

  updateTag(`contacts:${user.id}`);

  return { ok: true, data: undefined };
}

export async function unlinkContact(
  applicationId: unknown,
  contactId: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = linkSchema.safeParse({ applicationId, contactId });

  if (!parsed.success) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  await db
    .delete(applicationContacts)
    .where(
      and(
        eq(applicationContacts.applicationId, parsed.data.applicationId),
        eq(applicationContacts.contactId, parsed.data.contactId),
        eq(applicationContacts.userId, user.id),
      ),
    );

  updateTag(`contacts:${user.id}`);

  return { ok: true, data: undefined };
}

// The foreign keys do not check ownership, so the chosen company and every
// chosen application must belong to this user.
async function checkReferences(
  userId: string,
  values: ContactFormValues,
): Promise<ActionResult<never> | undefined> {
  const fieldErrors: Record<string, string[]> = {};

  if (values.companyId) {
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(eq(companies.id, values.companyId), eq(companies.userId, userId)),
      )
      .limit(1);

    if (!company) {
      fieldErrors.companyId = ["Perusahaan tidak ditemukan"];
    }
  }

  const owned = await findOwnedApplicationIds(userId, values.applicationIds);

  if (owned.length !== values.applicationIds.length) {
    fieldErrors.applicationIds = ["Ada lamaran yang tidak ditemukan"];
  }

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, message: "Periksa kembali isian form.", fieldErrors }
    : undefined;
}

async function findOwnedApplicationIds(userId: string, ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.userId, userId), inArray(applications.id, ids)));
}
