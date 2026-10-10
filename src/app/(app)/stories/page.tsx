import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoryCard } from "@/features/stories/components/story-card";
import { COMPETENCY_OPTIONS } from "@/features/stories/labels";
import { getStories } from "@/features/stories/queries";

export const metadata: Metadata = { title: "Cerita" };

export default function StoriesPage({ searchParams }: PageProps<"/stories">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cerita"
        description="Bank pengalamanmu dalam format STAR: situasi, tugas, aksi, hasil. Satu cerita bisa menjawab banyak pertanyaan."
        actions={
          <Link href="/stories/new" className={buttonVariants()}>
            <Plus />
            Tambah cerita
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Stories searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// searchParams is request-time data, so it is read behind the boundary.
async function Stories({
  searchParams,
}: Pick<PageProps<"/stories">, "searchParams">) {
  const params = await searchParams;
  const { total, matches, filter } = await getStories({
    q: first(params.q),
    competency: first(params.competency),
  });

  if (total === 0) {
    return (
      <EmptyState
        title="Tulis cerita pertamamu"
        description="Pilih satu pengalaman yang kamu banggakan, lalu urai jadi situasi, tugas, aksi, dan hasil. Tidak perlu sempurna."
      >
        <Link
          href="/stories/new"
          className={buttonVariants({ variant: "outline" })}
        >
          Mulai dari satu cerita
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <form className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={filter.q}
            aria-label="Cari cerita"
            placeholder="Cari judul atau isi cerita…"
            className="pl-8"
          />
        </div>
        <select
          name="competency"
          defaultValue={filter.competency}
          aria-label="Filter kompetensi"
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">Semua kompetensi</option>
          {COMPETENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Cari
        </Button>
        {filter.q !== "" || filter.competency !== "" ? (
          <Link
            href="/stories"
            className={buttonVariants({ variant: "ghost" })}
          >
            Reset
          </Link>
        ) : null}
      </form>

      {matches.length === 0 ? (
        <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Tidak ada cerita yang cocok. Ubah kata kunci atau filter.
        </p>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {matches.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </ul>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Menampilkan <span className="font-figure">{matches.length}</span>{" "}
            dari <span className="font-figure">{total}</span> cerita
          </p>
        </>
      )}
    </>
  );
}
