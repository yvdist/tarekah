import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";
import { withVerifiedSsl } from "./src/db/connection-string";

// drizzle-kit runs outside Next.js, so .env.local is not loaded for it.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    // Migrations need a direct connection, not the pooled one.
    url: withVerifiedSsl(process.env.DATABASE_URL_UNPOOLED ?? ""),
  },
});
