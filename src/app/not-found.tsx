import type { Metadata } from "next";
import Link from "next/link";
import { StateMessage } from "@/components/state-message";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <StateMessage
        title="Halaman tidak ditemukan"
        description="Alamat ini tidak ada atau sudah dipindahkan."
      >
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Ke beranda
        </Link>
      </StateMessage>
    </main>
  );
}
