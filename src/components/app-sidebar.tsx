import {
  BookOpen,
  Building2,
  ChartLine,
  CircleHelp,
  Columns3,
  FileText,
  List,
  type LucideIcon,
  MessagesSquare,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { MegaMendung } from "@/components/brand/mega-mendung";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/features/auth/components/user-menu";

type NavItem = { href: string; label: string; icon: LucideIcon };

const MAIN_ITEMS: NavItem[] = [
  { href: "/board", label: "Board", icon: Columns3 },
  { href: "/applications", label: "Lamaran", icon: List },
  { href: "/dashboard", label: "Dashboard", icon: ChartLine },
  { href: "/practice", label: "Latihan", icon: MessagesSquare },
];

const ARCHIVE_ITEMS: NavItem[] = [
  { href: "/companies", label: "Perusahaan", icon: Building2 },
  { href: "/contacts", label: "Kontak", icon: Users },
  { href: "/documents", label: "Dokumen", icon: FileText },
  { href: "/questions", label: "Pertanyaan", icon: CircleHelp },
  { href: "/stories", label: "Cerita", icon: BookOpen },
];

const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Pengaturan",
  icon: SlidersHorizontal,
};

const ITEM_CLASS =
  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

// The bar sits on the sidebar's edge, outside the item: -left-4 undoes the
// sidebar padding.
const ACTIVE_ITEM_CLASS =
  "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-1.5 before:-left-4 before:w-[3px] before:rounded-r-full before:bg-sidebar-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

// The same content fills the fixed sidebar and the mobile sheet.
export function AppSidebar() {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link
        href="/dashboard"
        className="relative flex h-10 items-center rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MegaMendung className="absolute right-2 bottom-0 w-24 text-foreground/15" />
        <Logo className="relative" />
      </Link>
      <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-6">
        <NavList items={MAIN_ITEMS} />
        <div className="flex flex-col gap-2">
          <p className="px-3 text-xs text-muted-foreground">Arsip</p>
          <NavList items={ARCHIVE_ITEMS} label="Arsip" />
        </div>
        <div className="mt-auto">
          <NavList items={[SETTINGS_ITEM]} />
        </div>
      </nav>
      <div className="border-t border-sidebar-border pt-4">
        <Suspense fallback={<div className="h-8" />}>
          <UserMenu />
        </Suspense>
      </div>
    </div>
  );
}

function NavList({ items, label }: { items: NavItem[]; label?: string }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.href}>
          {/* Until the pathname is known the link renders without its
              current state. */}
          <Suspense
            fallback={
              <Link href={item.href} className={ITEM_CLASS}>
                <NavItemContent item={item} />
              </Link>
            }
          >
            <NavLink
              href={item.href}
              className={ITEM_CLASS}
              activeClassName={ACTIVE_ITEM_CLASS}
            >
              <NavItemContent item={item} />
            </NavLink>
          </Suspense>
        </li>
      ))}
    </ul>
  );
}

function NavItemContent({ item }: { item: NavItem }) {
  return (
    <>
      <item.icon aria-hidden className="size-4 shrink-0" />
      {item.label}
    </>
  );
}
