"use client";

import { ErrorState } from "@/components/error-state";

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
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <ErrorState
        error={error}
        retry={retry}
        homeHref="/"
        homeLabel="Ke beranda"
      />
    </main>
  );
}
