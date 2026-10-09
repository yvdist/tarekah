"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StateMessage } from "@/components/state-message";
import { Button, buttonVariants } from "@/components/ui/button";

// Shared body of the error.tsx files. The error itself is not shown: on the
// server its message is replaced by a digest, which is only useful in logs.
export function ErrorState({
  error,
  retry,
  homeHref,
  homeLabel,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref: string;
  homeLabel: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StateMessage
      title="Terjadi kesalahan"
      description="Halaman ini gagal dimuat. Coba lagi; kalau masih gagal, kembali dan ulangi beberapa saat lagi."
    >
      <Button onClick={() => retry()}>Coba lagi</Button>
      <Link href={homeHref} className={buttonVariants({ variant: "outline" })}>
        {homeLabel}
      </Link>
    </StateMessage>
  );
}
