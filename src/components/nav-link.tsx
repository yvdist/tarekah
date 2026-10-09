"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// A navigation link that marks itself as current on its own route and the
// routes below it. Needs a <Suspense> boundary above it: on routes with a
// dynamic segment the pathname is not known while prerendering.
export function NavLink({
  href,
  className,
  activeClassName,
  children,
}: {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(className, current && activeClassName)}
    >
      {children}
    </Link>
  );
}
