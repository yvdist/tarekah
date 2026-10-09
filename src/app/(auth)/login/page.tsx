import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signInWithProvider } from "@/features/auth/actions";
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
    <main className="relative flex flex-1 items-center justify-center px-4">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Link href="/" className="font-semibold tracking-tight">
            Tarékah
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
          <p className="text-sm text-muted-foreground">
            Pakai akun GitHub atau Google. Data lamaranmu hanya bisa dilihat
            olehmu.
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
                className="w-full"
              >
                {provider.label}
              </Button>
            </form>
          ))}
        </div>
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
