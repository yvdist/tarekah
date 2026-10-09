import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-4">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="flex max-w-xl flex-col items-start gap-6">
        <p className="font-semibold tracking-tight">Tarékah</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          Catat setiap lamaran kerja, dari wishlist sampai offer.
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          Pantau status, riwayat perubahan, catatan interview, dan versi CV yang
          kamu pakai. Lihat lamaran mana yang perlu di-follow-up.
        </p>
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Mulai
        </Link>
      </div>
    </main>
  );
}
