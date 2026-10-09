import "server-only";
import { and, asc, count, eq, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { applications, documents } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type DocumentListItem = Awaited<
  ReturnType<typeof listDocumentsByUserId>
>[number];

export type DocumentOption = Pick<
  DocumentListItem,
  "id" | "type" | "label" | "isArchived"
>;

export async function getDocuments() {
  const user = await requireUser();

  return listDocumentsByUserId(user.id);
}

// Choices for the application form. Archived versions are included so the
// form can still show one that an application already uses.
export async function getDocumentOptions(): Promise<DocumentOption[]> {
  const documents = await getDocuments();

  return documents.map(({ id, type, label, isArchived }) => ({
    id,
    type,
    label,
    isArchived,
  }));
}

// Unexported: taking a userId argument, it must only be reachable through the
// session-resolving functions above. The usage count depends on applications,
// hence the second tag.
async function listDocumentsByUserId(userId: string) {
  "use cache";
  cacheTag(`documents:${userId}`, `applications:${userId}`);
  cacheLife("hours");

  return db
    .select({
      id: documents.id,
      type: documents.type,
      label: documents.label,
      url: documents.url,
      notes: documents.notes,
      isArchived: documents.isArchived,
      usageCount: count(applications.id),
    })
    .from(documents)
    .leftJoin(
      applications,
      and(
        eq(applications.userId, userId),
        or(
          eq(applications.cvDocumentId, documents.id),
          eq(applications.coverLetterDocumentId, documents.id),
        ),
      ),
    )
    .where(eq(documents.userId, userId))
    .groupBy(documents.id)
    .orderBy(asc(documents.isArchived), asc(documents.label));
}
