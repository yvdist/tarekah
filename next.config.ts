import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // In development Next.js prints every Server Action call with its
  // arguments. Here those are API keys being saved and the user's answers,
  // none of which belong in a terminal or a log file.
  logging: { serverFunctions: false },
  experimental: {
    serverActions: {
      // A recorded answer is sent to a Server Action to be transcribed: up to
      // RECORDING_MAX_BYTES (1.5 MB) of audio, over the default of 1 MB.
      bodySizeLimit: "2mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
