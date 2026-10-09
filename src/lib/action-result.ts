// Shape every Server Action returns. Failures are data, not thrown errors, so
// the calling form can show them next to the fields.
import { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

// Validation failures are returned as data, keyed by field for the form.
export function invalidResult(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    message: "Periksa kembali isian form.",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}
