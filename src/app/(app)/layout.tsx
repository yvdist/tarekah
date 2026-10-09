import Link from "next/link";
import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { PageSkeleton } from "@/components/skeletons";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/features/auth/components/user-menu";
import { requireUser } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/board", label: "Board" },
  { href: "/applications", label: "Lamaran" },
  { href: "/companies", label: "Perusahaan" },
  { href: "/documents", label: "Dokumen" },
  { href: "/contacts", label: "Kontak" },
  { href: "/questions", label: "Pertanyaan" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Pengaturan" },
];

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Lewati ke konten
      </a>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Tarékah
          </Link>
          <nav
            aria-label="Navigasi utama"
            className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto py-1 text-sm"
          >
            {NAV_ITEMS.map((item) => (
              // Until the pathname is known the link renders without its
              // current state.
              <Suspense
                key={item.href}
                fallback={
                  <Link
                    href={item.href}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                }
              >
                <NavLink href={item.href}>{item.label}</NavLink>
              </Suspense>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main
        id="konten"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 outline-none"
      >
        <Suspense fallback={<PageSkeleton />}>
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
