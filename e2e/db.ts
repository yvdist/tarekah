import { createHash, randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { E2E_AUTH_SECRET } from "./constants";

// Direct database access for test setup. Sign-in is OAuth only, which a test
// cannot drive, so a test user gets its session row written here: with
// database sessions the cookie value is simply sessions.session_token.

async function withClient<T>(run: (client: Client) => Promise<T>) {
  const client = new Client({
    connectionString: process.env.E2E_DATABASE_URL,
  });

  await client.connect();

  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export function migrateDatabase() {
  return withClient((client) =>
    migrate(drizzle({ client }), { migrationsFolder: "./drizzle" }),
  );
}

// Starts from nothing: an earlier run that crashed may have left the user.
export function createUser(email: string, name: string) {
  return withClient(async (client) => {
    const id = randomUUID();

    await client.query("delete from users where email = $1", [email]);
    await client.query(
      "insert into users (id, name, email) values ($1, $2, $3)",
      [id, name, email],
    );

    return id;
  });
}

// Domain rows cascade from the user.
export function deleteUser(email: string) {
  return withClient((client) =>
    client.query("delete from users where email = $1", [email]),
  );
}

export function createSession(email: string) {
  return withClient(async (client) => {
    const token = randomUUID();

    await client.query(
      `insert into sessions (session_token, user_id, expires)
       select $1, id, now() + interval '1 day' from users where email = $2`,
      [token, email],
    );

    return token;
  });
}

// The cookies a browser holds after a real sign-in. Besides the session there
// is Auth.js's CSRF cookie: without a valid one Auth.js generates a new token
// on every session read, which Next.js rejects while prefetching a page.
export function authCookies(sessionToken: string, baseURL: string) {
  const csrfToken = randomUUID();
  const csrfHash = createHash("sha256")
    .update(`${csrfToken}${E2E_AUTH_SECRET}`)
    .digest("hex");
  const cookie = { url: baseURL, httpOnly: true, sameSite: "Lax" as const };

  return [
    { ...cookie, name: "authjs.session-token", value: sessionToken },
    { ...cookie, name: "authjs.csrf-token", value: `${csrfToken}|${csrfHash}` },
  ];
}
