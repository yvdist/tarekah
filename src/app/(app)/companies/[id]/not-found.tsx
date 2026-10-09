import Link from "next/link";
import { StateMessage } from "@/components/state-message";
import { buttonVariants } from "@/components/ui/button";

export default function CompanyNotFound() {
  return (
    <StateMessage
      title="Perusahaan tidak ditemukan"
      description="Perusahaan ini sudah dihapus atau tautannya salah."
    >
      <Link
        href="/companies"
        className={buttonVariants({ variant: "outline" })}
      >
        Kembali ke daftar perusahaan
      </Link>
    </StateMessage>
  );
}
