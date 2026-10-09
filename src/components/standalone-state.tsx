import Link from "next/link";
import { Logo } from "@/components/brand/logo";

// Frame for a state message shown outside the app shell (the root not-found
// and error pages): the logo above a narrow card, centred like the login page.
export function StandaloneState({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <Link href="/" className="rounded-md">
        <Logo />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
