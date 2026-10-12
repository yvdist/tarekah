import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { auth } from "@/auth";
import { SESSION_COOKIES } from "./session-cookie";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

// Reads the session, so callers must render inside a <Suspense> boundary.
// cache() keeps it to one session lookup per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // A visitor without the cookie has no session, and asking Auth.js anyway
  // makes it mint a CSRF token for them. That is random, which Next.js rejects
  // when it renders a public page for a prefetch.
  const jar = await cookies();

  if (!SESSION_COOKIES.some((name) => jar.has(name))) {
    return null;
  }

  // Looking the session up is request-time work in ways a cookie read does not
  // cover: the first query opens a database connection, whose handshake draws
  // a random nonce; Auth.js compares the session's expiry with the clock; and
  // it mints a random CSRF token for a visitor who brings no valid one. Next.js
  // rejects all three while it prerenders or prefetches a page, and reading a
  // cookie does not make them acceptable; connection() does.
  await connection();

  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
