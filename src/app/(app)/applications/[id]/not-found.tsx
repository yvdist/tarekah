import Link from "next/link";
import { StateMessage } from "@/components/state-message";
import { buttonVariants } from "@/components/ui/button";

export default function ApplicationNotFound() {
  return (
    <StateMessage
      title="Lamaran tidak ditemukan"
      description="Lamaran ini sudah dihapus atau tautannya salah."
    >
      <Link
        href="/applications"
        className={buttonVariants({ variant: "outline" })}
      >
        Kembali ke daftar lamaran
      </Link>
    </StateMessage>
  );
}
