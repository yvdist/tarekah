"use client";

import { ErrorState } from "@/components/error-state";
import { StandaloneState } from "@/components/standalone-state";

// For the public pages; the signed-in area has its own boundary inside its
// layout.
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <StandaloneState>
      <ErrorState
        error={error}
        retry={retry}
        homeHref="/"
        homeLabel="Ke beranda"
      />
    </StandaloneState>
  );
}
