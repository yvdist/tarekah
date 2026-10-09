import { AccentE, Logo, Wordmark } from "@/components/brand/logo";
import { MegaMendung } from "@/components/brand/mega-mendung";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { SessionLink } from "@/features/auth/components/session-link";
import { BoardPreview } from "@/features/marketing/components/board-preview";
import { DeskPreview } from "@/features/marketing/components/desk-preview";
import { FollowUpDemo } from "@/features/marketing/components/follow-up-demo";
import { StepsPreview } from "@/features/marketing/components/steps-preview";
import { TimelinePreview } from "@/features/marketing/components/timeline-preview";
import { cn } from "@/lib/utils";

const REPO_URL = "https://github.com/yvdist/tarekah";
const AUTHOR_URL = "https://github.com/yvdist";

// Each feature is shown next to a piece of the app itself.
const FEATURES = [
  {
    title: "Tahu kapan harus menyapa lagi",
    body: "Tentukan berapa hari kamu mau menunggu kabar. Saat waktunya lewat, Tarékah memberi tanda kecil berwarna kunyit. Tidak ada notifikasi yang memburu.",
    hint: "Coba ubah lamanya.",
    preview: <FollowUpDemo />,
  },
  {
    title: "Semua catatan di satu meja",
    body: "Perusahaan, kontak recruiter, CV versi mana yang kamu kirim, dan pertanyaan interview yang pernah muncul. Tersimpan rapi, mudah dicari lagi.",
    preview: <DeskPreview />,
  },
  {
    title: "Lihat jalan yang sudah ditempuh",
    body: "Dashboard menghitung léngkah ikhtiarmu dan menunjukkan di tahap mana lamaran paling sering berhenti, supaya langkah berikutnya lebih terarah.",
    preview: <StepsPreview />,
  },
];

// What a visitor wants to know before signing in.
const FACTS = [
  {
    term: "Gratis",
    detail: "Tidak ada paket berbayar dan tidak perlu kartu kredit.",
  },
  {
    term: "Tanpa kata sandi baru",
    detail: "Masuk dengan akun GitHub atau Google yang sudah kamu punya.",
  },
  {
    term: "Hanya kamu yang melihat",
    detail:
      "Setiap catatan terikat ke akunmu. Tidak ada profil publik, tidak ada papan peringkat.",
  },
  {
    term: "Datamu bisa dibawa pulang",
    detail: "Unduh semua lamaranmu sebagai CSV kapan saja.",
  },
  {
    term: "Kodenya terbuka",
    detail: (
      <>
        Cara kerjanya bisa kamu baca sendiri di{" "}
        <a
          href={REPO_URL}
          className="text-foreground underline underline-offset-4"
        >
          GitHub
        </a>
        .
      </>
    ),
  },
];

const CONTAINER = "mx-auto w-full max-w-5xl px-5 sm:px-8";
const CTA = "h-11 px-5";
const FOOTER_LINK =
  "rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring";

export default function LandingPage() {
  return (
    <>
      <header className="sticky top-0 z-20 header-rule bg-background">
        <div
          className={cn(CONTAINER, "flex items-center justify-between py-4")}
        >
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SessionLink
              guestLabel="Masuk"
              userLabel="Buka dashboard"
              className={buttonVariants({ variant: "outline" })}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-clip">
        <section className={cn(CONTAINER, "relative pt-14 pb-14 sm:pt-24")}>
          {/* Behind the text, which is why every block below is `relative`. */}
          <div
            data-hello
            className="absolute top-4 -right-24 cloud-alive text-foreground/10 md:top-16 md:-right-40"
          >
            <MegaMendung className="w-56 md:w-[27rem]" />
          </div>
          <div className="absolute top-64 right-24 hidden cloud-alive text-foreground/10 lg:block">
            <MegaMendung className="w-64" />
          </div>
          <p className="relative rise-in text-sm text-muted-foreground">
            <span className="font-heading text-base font-semibold text-foreground">
              tarékah
            </span>{" "}
            (Sunda) ikhtiar, usaha sungguh-sungguh
          </p>
          <h1 className="relative mt-5 max-w-2xl font-heading text-5xl leading-[1.05] font-medium tracking-tight sm:text-7xl">
            <span className="sr-only">Setiap lamaran adalah satu léngkah.</span>
            <span aria-hidden>
              <span className="block rise-in [--i:1]">Setiap lamaran</span>
              <span className="block rise-in [--i:2]">
                adalah satu{" "}
                <span className="whitespace-nowrap">
                  l
                  <AccentE className="top-[0.3em] left-[0.16em] stroke-draw [--stroke-delay:1000ms] sm:top-[0.36em]" />
                  ngkah.
                </span>
              </span>
            </span>
          </h1>
          <p className="relative mt-6 max-w-xl rise-in text-lg text-pretty text-muted-foreground [--i:3]">
            Catat ke mana saja kamu melamar, kapan harus follow-up, dan sudah
            sejauh mana jalanmu. Tenang, rapi, dan tanpa menghakimi.
          </p>
          <div className="relative mt-8 flex rise-in flex-wrap items-center gap-2 [--i:4]">
            <SessionLink
              guestLabel="Mulai mencatat"
              userLabel="Lanjutkan mencatat"
              className={buttonVariants({ size: "lg", className: CTA })}
            />
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

        <div className={cn(CONTAINER, "rise-in [--i:6]")}>
          <BoardPreview />
        </div>

        <section
          id="cara-kerja"
          className={cn(
            CONTAINER,
            "flex scroll-mt-20 flex-col gap-y-20 py-20 md:gap-y-28 md:py-28",
          )}
        >
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="grid items-center gap-x-16 gap-y-8 lg:grid-cols-2"
            >
              <div
                className={cn(
                  "flex flex-col gap-3",
                  index % 2 === 1 && "lg:order-last",
                )}
              >
                <h2 className="font-heading text-3xl leading-tight font-medium tracking-tight text-balance">
                  {feature.title}
                </h2>
                <p className="max-w-md leading-relaxed text-pretty text-muted-foreground">
                  {feature.body}
                </p>
                {feature.hint ? (
                  <p className="text-sm text-muted-foreground max-lg:hidden">
                    {feature.hint}
                  </p>
                ) : null}
              </div>
              {feature.preview}
            </div>
          ))}
        </section>

        <div className={CONTAINER}>
          <hr />
        </div>

        <section
          className={cn(
            CONTAINER,
            "grid items-center gap-x-16 gap-y-10 py-20 md:py-28 lg:grid-cols-2",
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
          <TimelinePreview />
        </section>

        <div className={CONTAINER}>
          <hr />
        </div>

        <section
          className={cn(
            CONTAINER,
            "grid gap-x-16 gap-y-8 py-20 md:py-28 lg:grid-cols-[1fr_1.4fr]",
          )}
        >
          <h2 className="font-heading text-4xl leading-[1.1] font-medium tracking-tight">
            Sebelum kamu mulai
          </h2>
          <dl className="flex flex-col">
            {FACTS.map((fact) => (
              <div
                key={fact.term}
                className="grid gap-x-8 gap-y-1 border-t py-5 last:border-b sm:grid-cols-[16rem_1fr]"
              >
                <dt className="font-heading text-xl font-medium tracking-tight">
                  {fact.term}
                </dt>
                <dd className="text-pretty text-muted-foreground">
                  {fact.detail}
                </dd>
              </div>
            ))}
          </dl>
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
          <SessionLink
            guestLabel="Mulai mencatat"
            userLabel="Lanjutkan mencatat"
            className={buttonVariants({
              size: "lg",
              className: cn(CTA, "mt-8"),
            })}
          />
        </section>
      </main>

      <footer className={CONTAINER}>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t py-8">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <Wordmark className="text-lg" />
            <p className="text-xs text-muted-foreground">
              Dibuat dengan tekun oleh{" "}
              <a href={AUTHOR_URL} className={FOOTER_LINK}>
                Yudistira Eka Pratama
              </a>
              .
            </p>
          </div>
          <a
            href={REPO_URL}
            className={cn(FOOTER_LINK, "text-xs text-muted-foreground")}
          >
            Kode di GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
