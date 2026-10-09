import { z } from "zod";

export const providerSchema = z.enum(["github", "google"]);

export type Provider = z.infer<typeof providerSchema>;
