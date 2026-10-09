import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/features/auth/components/user-menu";
import { requireUser } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/board", label: "Board" },
  { href: "/applications", label: "Lamaran" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Pengaturan" },
];

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Tarékah
          </Link>
          <nav className="flex flex-1 items-center gap-4 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
          <Authenticated>{children}</Authenticated>
        </Suspense>
      </main>
    </div>
  );
}

// Redirects signed-out visitors (for example with an expired session cookie
// that got past the proxy). This is not a data guard: Next.js renders page
// segments independently of layouts, so each page's data must still go through
// requireUser() in its queries.
async function Authenticated({ children }: { children: React.ReactNode }) {
  await requireUser();

  return children;
}
