import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type CompanyOption = Awaited<
  ReturnType<typeof listCompanyOptionsByUserId>
>[number];

export async function getCompanyOptions() {
  const user = await requireUser();

  return listCompanyOptionsByUserId(user.id);
}

// Unexported: taking a userId argument, it must only be reachable through the
// session-resolving function above.
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
