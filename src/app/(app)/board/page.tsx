import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Board } from "@/features/applications/components/board";
import { getBoardItems } from "@/features/applications/queries";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
        <Link href="/applications/new" className={buttonVariants()}>
          <Plus />
          Tambah lamaran
        </Link>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground">Memuat board…</p>}
      >
        <BoardData />
      </Suspense>
    </div>
  );
}

async function BoardData() {
  return <Board items={await getBoardItems()} />;
}
