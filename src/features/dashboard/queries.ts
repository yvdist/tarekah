import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { todayInJakarta, type DateRange } from "./range";
import { queryStats, queryWeekly } from "./stats";

export type DashboardStats = Awaited<ReturnType<typeof queryStats>>;
export type WeeklyCount = Awaited<ReturnType<typeof queryWeekly>>[number];

export async function getDashboardStats(range: Pick<DateRange, "from" | "to">) {
  const user = await requireUser();

  return loadStatsByUserId(user.id, range.from, range.to);
}

// Always the latest weeks, whatever the date filter says.
export async function getWeeklyApplications() {
  const user = await requireUser();

  // The clock is read here, outside the cached function, at request time.
  await connection();

  return loadWeeklyByUserId(user.id, todayInJakarta(Date.now()));
}

// The cached functions below stay unexported: taking a userId argument, they
// must only be reachable through the session-resolving functions above.

async function loadStatsByUserId(
  userId: string,
  from: string | null,
  to: string | null,
) {
  "use cache";
  cacheTag(`applications:${userId}`, `documents:${userId}`);
  cacheLife("hours");

  return queryStats(db, userId, from, to);
}

async function loadWeeklyByUserId(userId: string, today: string) {
  "use cache";
  cacheTag(`applications:${userId}`);
  cacheLife("hours");

  return queryWeekly(db, userId, today);
}
