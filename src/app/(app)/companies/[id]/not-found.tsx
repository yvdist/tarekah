import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function CompanyNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <h1 className="text-lg font-medium">Perusahaan tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Perusahaan ini sudah dihapus atau tautannya salah.
      </p>
      <Link
        href="/companies"
        className={buttonVariants({ variant: "outline" })}
      >
        Kembali ke daftar perusahaan
      </Link>
    </div>
  );
}
