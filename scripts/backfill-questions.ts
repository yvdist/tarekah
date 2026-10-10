// Copies the questions still held as markdown in interviews.questions into the
// questions table, for every user.
//
//   npm run db:backfill-questions -- [--dry-run]
//
// One-time step after the release that introduced the questions table; see
// docs/deploy.md. Safe to run again: a question already present for its
// interview is skipped. --dry-run only reports what would be written.
//
// This runs outside Next.js, so it cannot use src/db/index.ts (server-only,
// env validation) and opens its own short-lived connection instead.
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { backfillQuestions } from "../src/features/questions/backfill";

async function main() {
  const dryRun = process.argv.slice(2).includes("--dry-run");

  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }

  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Set DATABASE_URL_UNPOOLED or DATABASE_URL first.");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });

  try {
    console.log(`Database: ${new URL(connectionString).host}`);
    console.log(`Mode:     ${dryRun ? "dry run (nothing written)" : "write"}`);

    const summary = await backfillQuestions(db, { dryRun });

    console.log(
      `Interviews with questions: ${summary.interviews}\n` +
        `Questions ${dryRun ? "to insert" : "inserted"}: ${summary.inserted}\n` +
        `Already present, skipped:  ${summary.skipped}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
