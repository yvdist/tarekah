import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { MegaMendung } from "@/components/brand/mega-mendung";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signInWithProvider } from "@/features/auth/actions";
import { ProviderIcon } from "@/features/auth/components/provider-icon";
import type { Provider } from "@/features/auth/schemas";

export const metadata: Metadata = { title: "Masuk" };

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "github", label: "Lanjut dengan GitHub" },
  { id: "google", label: "Lanjut dengan Google" },
];

// Auth.js sends failed sign-ins back here with ?error=<code>.
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Email ini sudah terdaftar lewat penyedia lain. Masuk dengan penyedia yang kamu pakai sebelumnya.",
  AccessDenied: "Akses ditolak. Coba lagi atau pakai akun lain.",
};

const DEFAULT_ERROR_MESSAGE = "Gagal masuk. Coba lagi.";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
      <MegaMendung className="pointer-events-none absolute -right-28 -bottom-12 w-[34rem] max-w-none text-foreground/10" />
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-8">
        <Link href="/" className="rounded-md">
          <Logo />
        </Link>
        <div className="flex w-full flex-col gap-6 rounded-lg border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-[2rem] leading-tight font-medium tracking-tight">
              Masuk
            </h1>
            <p className="text-sm text-pretty text-muted-foreground">
              Pakai akun GitHub atau Google untuk membuka catatanmu.
            </p>
          </div>
          <Suspense fallback={null}>
            <SignInError searchParams={searchParams} />
          </Suspense>
          <div className="flex flex-col gap-2">
            {PROVIDERS.map((provider) => (
              <form
                key={provider.id}
                action={signInWithProvider.bind(null, provider.id)}
              >
                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  className="h-11 w-full"
                >
                  <ProviderIcon provider={provider.id} />
                  {provider.label}
                </Button>
              </form>
            ))}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Data lamaranmu hanya bisa dilihat olehmu.
        </p>
      </div>
    </main>
  );
}

// searchParams is request-time data, so it is read behind the boundary.
async function SignInError({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;

  if (typeof error !== "string") {
    return null;
  }

  return (
    <p role="alert" className="text-sm text-destructive">
      {ERROR_MESSAGES[error] ?? DEFAULT_ERROR_MESSAGE}
    </p>
  );
}
