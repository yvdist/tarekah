import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import {
  filterStories,
  findStory,
  listStories,
  type StoryListItem,
} from "./data";
import { storyFilterSchema, storyIdSchema } from "./schemas";

export type { StoryListItem };
export type StoryDetail = NonNullable<Awaited<ReturnType<typeof getStory>>>;

// Every story of the user, filtered in memory after the cached read. The
// filter values come from the URL, so they are parsed as untrusted.
export async function getStories(filter: Record<string, string | undefined>) {
  const user = await requireUser();
  const all = await listStoriesByUserId(user.id);
  const parsed = storyFilterSchema.parse(filter);

  return {
    total: all.length,
    matches: filterStories(all, parsed),
    filter: parsed,
  };
}

// A row that does not exist or belongs to someone else is a 404 either way.
export async function getStory(id: string) {
  const user = await requireUser();
  const parsed = storyIdSchema.safeParse(id);

  if (!parsed.success) {
    notFound();
  }

  const story = await findStoryByUserId(user.id, parsed.data);

  if (!story) {
    notFound();
  }

  return story;
}

// Choices for linking a question to stories.
export async function getStoryOptions() {
  const user = await requireUser();
  const rows = await listStoriesByUserId(user.id);

  return rows
    .map((row) => ({ id: row.id, title: row.title }))
    .sort((a, b) => a.title.localeCompare(b.title, "id"));
}

// The cached functions below stay unexported: taking a userId argument, they
// must only be reachable through the session-resolving functions above.

async function listStoriesByUserId(userId: string) {
  "use cache";
  cacheTag(`stories:${userId}`, `questions:${userId}`);
  cacheLife("hours");

  return listStories(db, userId);
}

async function findStoryByUserId(userId: string, id: string) {
  "use cache";
  cacheTag(`stories:${userId}`, `questions:${userId}`);
  cacheLife("hours");

  return findStory(db, userId, id);
}
