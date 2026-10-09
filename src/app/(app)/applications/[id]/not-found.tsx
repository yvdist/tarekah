import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function ApplicationNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <h1 className="text-lg font-medium">Lamaran tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Lamaran ini sudah dihapus atau tautannya salah.
      </p>
      <Link
        href="/applications"
        className={buttonVariants({ variant: "outline" })}
      >
        Kembali ke daftar lamaran
      </Link>
    </div>
  );
}
