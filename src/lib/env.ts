import "server-only";
import { z } from "zod";

// The OAuth provider variables (AUTH_GITHUB_*, AUTH_GOOGLE_*) are read by
// Auth.js itself by naming convention, so they are not repeated here.
const envSchema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join("."));
  throw new Error(
    `Missing or invalid environment variables: ${names.join(", ")}. See .env.example.`,
  );
}

export const env = parsed.data;
