import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // The real package throws on import outside a React Server environment.
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Many files start an in-memory Postgres and apply the migrations in a
    // hook, all at once. On a machine short of memory that takes longer than
    // the default ten seconds, and the suite fails without a test having run.
    hookTimeout: 60_000,
  },
});
