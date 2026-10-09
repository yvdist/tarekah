import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signInWithProvider } from "@/features/auth/actions";
import type { Provider } from "@/features/auth/schemas";

export const metadata: Metadata = { title: "Masuk" };

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "github", label: "Lanjut dengan GitHub" },
  { id: "google", label: "Lanjut dengan Google" },
];

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
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
