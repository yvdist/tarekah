import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { DEFAULT_FOLLOW_UP_SETTINGS, type FollowUpSettings } from "./constants";

export async function getFollowUpSettings() {
  const user = await requireUser();

  return findFollowUpSettingsByUserId(user.id);
}

// Unexported: taking a userId argument, it must only be reachable through the
// session-resolving function above.
async function findFollowUpSettingsByUserId(
  userId: string,
): Promise<FollowUpSettings> {
  "use cache";
  cacheTag(`settings:${userId}`);
  cacheLife("hours");

  const [settings] = await db
    .select({
      followUpAfterDays: userSettings.followUpAfterDays,
      ghostedAfterDays: userSettings.ghostedAfterDays,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings ?? DEFAULT_FOLLOW_UP_SETTINGS;
}
