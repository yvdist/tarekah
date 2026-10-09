import type { Metadata } from "next";
import Link from "next/link";
import { StandaloneState } from "@/components/standalone-state";
import { StateMessage } from "@/components/state-message";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <StandaloneState>
      <StateMessage
        title="Halaman tidak ditemukan"
        description="Alamat ini tidak ada atau sudah dipindahkan."
      >
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Ke beranda
        </Link>
      </StateMessage>
    </StandaloneState>
  );
}
