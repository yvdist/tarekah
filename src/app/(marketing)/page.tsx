import Link from "next/link";
import { Logo, Wordmark } from "@/components/brand/logo";
import { MegaMendung } from "@/components/brand/mega-mendung";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { BoardPreview } from "@/features/marketing/components/board-preview";
import { StepsPreview } from "@/features/marketing/components/steps-preview";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    title: "Tahu kapan harus menyapa lagi",
    body: "Tentukan berapa hari kamu mau menunggu kabar. Saat waktunya lewat, Tarékah memberi tanda kecil berwarna kunyit. Tidak ada notifikasi yang memburu.",
  },
  {
    title: "Semua catatan di satu meja",
    body: "Perusahaan, kontak recruiter, CV versi mana yang kamu kirim, dan pertanyaan interview yang pernah muncul. Tersimpan rapi, mudah dicari lagi.",
  },
  {
    title: "Lihat jalan yang sudah ditempuh",
    body: "Dashboard menghitung léngkah ikhtiarmu dan menunjukkan di tahap mana lamaran paling sering berhenti, supaya langkah berikutnya lebih terarah.",
  },
];

const CONTAINER = "mx-auto w-full max-w-5xl px-5 sm:px-8";
const CTA = "h-11 px-5";

export default function LandingPage() {
  return (
    <>
      <header
        className={cn(CONTAINER, "flex items-center justify-between py-5")}
      >
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" })}
          >
            Masuk
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-x-clip">
        <section className={cn(CONTAINER, "relative pt-14 pb-14 sm:pt-24")}>
          <MegaMendung className="pointer-events-none absolute top-16 -right-40 hidden w-[27rem] text-foreground/10 md:block" />
          <MegaMendung className="pointer-events-none absolute top-64 right-24 hidden w-64 text-foreground/10 lg:block" />
          <p className="relative font-figure text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Tarékah · ikhtiar, usaha sungguh-sungguh
          </p>
          <h1 className="relative mt-5 max-w-2xl font-heading text-5xl leading-[1.05] font-medium tracking-tight sm:text-7xl">
            Setiap lamaran <br className="max-sm:hidden" />
            adalah satu léngkah.
          </h1>
          <p className="relative mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
            Catat ke mana saja kamu melamar, kapan harus follow-up, dan sudah
            sejauh mana jalanmu. Tenang, rapi, dan tanpa menghakimi.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({ size: "lg", className: CTA })}
            >
              Mulai mencatat
            </Link>
            <a
              href="#cara-kerja"
              className={buttonVariants({
                variant: "ghost",
                size: "lg",
                className: CTA,
              })}
            >
              Lihat cara kerjanya
            </a>
          </div>
        </section>

        <div className={CONTAINER}>
          <BoardPreview />
        </div>

        <section
          id="cara-kerja"
          className={cn(
            CONTAINER,
            "grid scroll-mt-8 gap-x-12 gap-y-10 py-20 md:grid-cols-3 md:py-28",
          )}
        >
          {FEATURES.map((feature, index) => (
            <div key={feature.title} className="flex flex-col gap-3">
              <p className="font-figure text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="font-heading text-2xl leading-tight font-medium tracking-tight text-balance">
                {feature.title}
              </h2>
              <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </section>

        <div className={CONTAINER}>
          <hr />
        </div>

        <section
          className={cn(
            CONTAINER,
            "grid items-center gap-x-16 gap-y-10 py-20 lg:grid-cols-2",
          )}
        >
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-4xl leading-[1.1] font-medium tracking-tight">
              Ditolak juga dicatat.
              <br />
              Itu tetap léngkah.
            </h2>
            <p className="max-w-md text-pretty text-muted-foreground">
              Mencari kerja itu melelahkan. Tarékah tidak memberi skor, tidak
              membandingkan kamu dengan orang lain. Hanya catatan jujur tentang
              usaha yang sudah kamu lakukan.
            </p>
          </div>
          <StepsPreview />
        </section>

        <section
          className={cn(
            CONTAINER,
            "flex flex-col items-center py-20 text-center md:py-28",
          )}
        >
          <MegaMendung className="w-24 text-primary" />
          <h2 className="mt-6 font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            Mulai léngkah pertamamu
          </h2>
          <p className="mt-4 max-w-sm text-pretty text-muted-foreground">
            Masuk dengan akun GitHub atau Google, lalu catat lamaran pertamamu.
          </p>
          <Link
            href="/login"
            className={buttonVariants({
              size: "lg",
              className: cn(CTA, "mt-8"),
            })}
          >
            Mulai mencatat
          </Link>
        </section>
      </main>

      <footer className={CONTAINER}>
        <div className="flex items-center justify-between gap-4 border-t py-8">
          <Wordmark className="text-lg" />
          <p className="text-xs text-muted-foreground">Dibuat dengan tekun.</p>
        </div>
      </footer>
    </>
  );
}
