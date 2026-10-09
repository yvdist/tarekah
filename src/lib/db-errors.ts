// Postgres unique_violation. Drizzle wraps driver errors, so the code may sit
// on the cause.
export function isUniqueViolation(error: unknown) {
  return errorCode(error) === "23505" || errorCode(cause(error)) === "23505";
}

function cause(error: unknown) {
  return error instanceof Error ? error.cause : undefined;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}
