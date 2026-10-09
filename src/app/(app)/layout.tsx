import Link from "next/link";
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Logo } from "@/components/brand/logo";
import { MobileNav } from "@/components/mobile-nav";
import { PageSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Lewati ke konten
      </a>
      {/* Small screens: a top bar, with the sidebar in a sheet. */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-sidebar px-4 md:hidden">
        <Link
          href="/dashboard"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>
        <MobileNav>
          <AppSidebar />
        </MobileNav>
      </header>
      {/* The colour runs the full height of the page; the content stays in
          view while the page scrolls. */}
      <aside className="hidden w-58 shrink-0 bg-sidebar md:block">
        <div className="sticky top-0 h-dvh overflow-y-auto">
          <AppSidebar />
        </div>
      </aside>
      <main
        id="konten"
        tabIndex={-1}
        className="min-w-0 flex-1 px-4 py-6 outline-none md:p-8"
      >
        {/* A page that needs the full width (the board) marks its root with
            data-full-width. */}
        <div className="mx-auto w-full max-w-6xl has-[[data-full-width]]:max-w-none">
          <Suspense fallback={<PageSkeleton />}>
            <Authenticated>{children}</Authenticated>
          </Suspense>
        </div>
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
