import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "../actions";

export async function UserMenu() {
  const user = await requireUser();
  const name = user.name ?? user.email ?? "";

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground uppercase"
      >
        {name.trim().charAt(0)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {name}
      </span>
      <div className="flex shrink-0 items-center">
        <ThemeToggle />
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label="Keluar"
            title="Keluar"
          >
            <LogOut aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}
