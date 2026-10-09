"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// The navigation sheet for small screens. The sidebar itself is passed in, so
// it stays a Server Component.
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Buka navigasi" />
        }
      >
        <Menu aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
        <SheetTitle className="sr-only">Navigasi</SheetTitle>
        {/* Following a link closes the sheet. */}
        <div
          className="h-full overflow-y-auto"
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("a")) {
              setOpen(false);
            }
          }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
