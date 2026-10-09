"use client";

import { ErrorState } from "@/components/error-state";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorState
      error={error}
      retry={retry}
      homeHref="/dashboard"
      homeLabel="Ke dashboard"
    />
  );
}
