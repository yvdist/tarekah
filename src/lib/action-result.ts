// Shape every Server Action returns. Failures are data, not thrown errors, so
// the calling form can show them next to the fields.
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
