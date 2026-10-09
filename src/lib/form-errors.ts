import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

// Copies field errors returned by a Server Action onto the matching fields.
export function setFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: Record<string, string[]> | undefined,
  names: ReadonlyArray<Path<T>>,
) {
  for (const name of names) {
    const message = fieldErrors?.[name]?.[0];

    if (message) {
      setError(name, { message });
    }
  }
}

// Builds an aria-describedby value from the ids that are currently rendered,
// so a field's hint and error are read out with it.
export function describedBy(...ids: Array<string | false>) {
  return ids.filter(Boolean).join(" ") || undefined;
}
