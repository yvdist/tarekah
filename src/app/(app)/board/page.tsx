import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { BoardSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Board } from "@/features/applications/components/board";
import {
  BoardFilterProvider,
  BoardToolbar,
} from "@/features/applications/components/board-filters";
import {
  followUpLabel,
  isFollowUpStatus,
} from "@/features/applications/follow-up";
import { getBoardItems } from "@/features/applications/queries";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <BoardFilterProvider>
      <div data-full-width className="flex flex-col gap-6">
        <PageHeader
          title="Board"
          description={
            <Suspense fallback={<Skeleton className="h-5 w-56" />}>
              <BoardSummary />
            </Suspense>
          }
          actions={
            <>
              <BoardToolbar />
              <Link
                href="/applications/new"
                className={buttonVariants({ size: "lg" })}
              >
                <Plus />
                Tambah lamaran
              </Link>
            </>
          }
        />
        <Suspense fallback={<BoardSkeleton />}>
          <BoardData />
        </Suspense>
      </div>
    </BoardFilterProvider>
  );
}

async function BoardSummary() {
  const items = await getBoardItems();

  if (items.length === 0) {
    return <p>Belum ada lamaran yang dicatat.</p>;
  }

  const active = items.filter((item) => isFollowUpStatus(item.status)).length;
  const overdue = items.filter((item) => followUpLabel(item.followUp)).length;

  return (
    <p>
      {active} lamaran aktif
      {overdue > 0 ? (
        <>
          {" · "}
          <span className="font-medium text-kunyit-tua">
            {overdue} perlu follow-up
          </span>
        </>
      ) : null}
    </p>
  );
}

async function BoardData() {
  return <Board items={await getBoardItems()} />;
}
