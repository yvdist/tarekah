import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import {
  applicationContacts,
  applications,
  companies,
  contacts,
} from "@/db/schema";
import { applicationIdSchema } from "@/features/applications/schemas";
import { requireUser } from "@/lib/auth";

export type ContactListItem = Awaited<
  ReturnType<typeof listContactsByUserId>
>[number];

export async function getContacts() {
  const user = await requireUser();

  return listContactsByUserId(user.id);
}

// Contacts linked to one application, and the rest as candidates to link.
export async function getContactsForApplication(applicationId: string) {
  const all = await getContacts();
  const parsed = applicationIdSchema.safeParse(applicationId);
  const isLinked = (contact: ContactListItem) =>
    parsed.success &&
    contact.applications.some((application) => application.id === parsed.data);

  return {
    linked: all.filter(isLinked),
    available: all.filter((contact) => !isLinked(contact)),
  };
}

// Unexported: taking a userId argument, it must only be reachable through the
// session-resolving functions above. It shows company and application names
// too, hence the extra tags.
async function listContactsByUserId(userId: string) {
  "use cache";
  cacheTag(
    `contacts:${userId}`,
    `companies:${userId}`,
    `applications:${userId}`,
  );
  cacheLife("hours");

  const [rows, links] = await Promise.all([
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        role: contacts.role,
        companyId: contacts.companyId,
        companyName: companies.name,
        email: contacts.email,
        linkedinUrl: contacts.linkedinUrl,
        notes: contacts.notes,
      })
      .from(contacts)
      .leftJoin(
        companies,
        and(eq(companies.id, contacts.companyId), eq(companies.userId, userId)),
      )
      .where(eq(contacts.userId, userId))
      .orderBy(asc(contacts.name)),
    db
      .select({
        contactId: applicationContacts.contactId,
        id: applications.id,
        position: applications.position,
        companyName: companies.name,
      })
      .from(applicationContacts)
      .innerJoin(
        applications,
        and(
          eq(applications.id, applicationContacts.applicationId),
          eq(applications.userId, userId),
        ),
      )
      .innerJoin(
        companies,
        and(
          eq(companies.id, applications.companyId),
          eq(companies.userId, userId),
        ),
      )
      .where(eq(applicationContacts.userId, userId))
      .orderBy(asc(companies.name), asc(applications.position)),
  ]);

  return rows.map((row) => ({
    ...row,
    applications: links
      .filter((link) => link.contactId === row.id)
      .map(({ id, position, companyName }) => ({ id, position, companyName })),
  }));
}
