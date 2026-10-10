import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { auth } from "@/auth";
import { env } from "./env";
import { CSRF_COOKIES, SESSION_COOKIES } from "./session-cookie";

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

  // Auth.js also mints a CSRF token for a signed-in visitor who brings no
  // valid one, and that is common: the session cookie lasts thirty days, the
  // CSRF cookie only until the browser closes, and a render cannot set it
  // again. Reading a cookie does not make a random value acceptable to
  // Next.js; connection() does. It takes what depends on the session out of
  // prefetching, so it is only called when a token is about to be minted.
  if (!hasValidCsrfCookie(jar)) {
    await connection();
  }

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

// The check Auth.js makes itself (createCSRFToken in @auth/core): the cookie
// is "token|hash", the hash being SHA-256 of the token and the secret. Should
// Auth.js change that, this answers false and only the prefetch is lost.
function hasValidCsrfCookie(jar: Awaited<ReturnType<typeof cookies>>) {
  return CSRF_COOKIES.some((name) => {
    const [token, hash] = jar.get(name)?.value.split("|") ?? [];

    return (
      !!token &&
      createHash("sha256")
        .update(`${token}${env.AUTH_SECRET}`)
        .digest("hex") === hash
    );
  });
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
