import "server-only";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { applications, companies, contacts } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const companyIdSchema = z.uuid();

export type CompanyOption = Awaited<
  ReturnType<typeof listCompanyOptionsByUserId>
>[number];

export type CompanyListItem = Awaited<
  ReturnType<typeof listCompaniesByUserId>
>[number];

export async function getCompanyOptions() {
  const user = await requireUser();

  return listCompanyOptionsByUserId(user.id);
}

export async function getCompanies() {
  const user = await requireUser();

  return listCompaniesByUserId(user.id);
}

export async function getCompany(id: string) {
  const user = await requireUser();
  const parsed = companyIdSchema.safeParse(id);

  if (!parsed.success) {
    notFound();
  }

  const company = await findCompanyByUserId(user.id, parsed.data);

  if (!company) {
    notFound();
  }

  return company;
}

// The cached functions below stay unexported: taking a userId argument, they
// must only be reachable through the session-resolving functions above.

async function listCompanyOptionsByUserId(userId: string) {
  "use cache";
  cacheTag(`companies:${userId}`);
  cacheLife("hours");

  return db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.userId, userId))
    .orderBy(asc(companies.name));
}

async function listCompaniesByUserId(userId: string) {
  "use cache";
  cacheTag(`companies:${userId}`, `applications:${userId}`);
  cacheLife("hours");

  return db
    .select({
      id: companies.id,
      name: companies.name,
      website: companies.website,
      applicationCount: count(applications.id),
    })
    .from(companies)
    .leftJoin(
      applications,
      and(
        eq(applications.companyId, companies.id),
        eq(applications.userId, userId),
      ),
    )
    .where(eq(companies.userId, userId))
    .groupBy(companies.id)
    .orderBy(asc(companies.name));
}

async function findCompanyByUserId(userId: string, id: string) {
  "use cache";
  cacheTag(
    `companies:${userId}`,
    `applications:${userId}`,
    `contacts:${userId}`,
  );
  cacheLife("hours");

  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      website: companies.website,
      notes: companies.notes,
    })
    .from(companies)
    .where(and(eq(companies.id, id), eq(companies.userId, userId)));

  if (!company) {
    return undefined;
  }

  const [companyApplications, companyContacts] = await Promise.all([
    db
      .select({
        id: applications.id,
        position: applications.position,
        status: applications.status,
        appliedAt: applications.appliedAt,
      })
      .from(applications)
      .where(
        and(eq(applications.companyId, id), eq(applications.userId, userId)),
      )
      .orderBy(desc(applications.createdAt)),
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        role: contacts.role,
        title: contacts.title,
        email: contacts.email,
        linkedinUrl: contacts.linkedinUrl,
      })
      .from(contacts)
      .where(and(eq(contacts.companyId, id), eq(contacts.userId, userId)))
      .orderBy(asc(contacts.name)),
  ]);

  return {
    ...company,
    applications: companyApplications,
    contacts: companyContacts,
  };
}
