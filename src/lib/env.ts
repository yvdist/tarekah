import "server-only";
import { z } from "zod";

// The OAuth provider variables (AUTH_GITHUB_*, AUTH_GOOGLE_*) are read by
// Auth.js itself by naming convention, so they are not repeated here.
const envSchema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  SITE_URL: z.url().optional(),
  // Set by Vercel: the production host, without the protocol.
  VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join("."));
  throw new Error(
    `Missing or invalid environment variables: ${names.join(", ")}. See .env.example.`,
  );
}

export const env = parsed.data;

// Where the app is served, for the absolute URLs in metadata.
export const siteUrl =
  env.SITE_URL ??
  (env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
