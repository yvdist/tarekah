import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getApplicationOptions } from "@/features/applications/queries";
import {
  AddQuestionButton,
  QuestionRow,
} from "@/features/questions/components/question-row";
import { ReadinessSummaryLine } from "@/features/questions/components/readiness-summary";
import {
  QUESTION_CATEGORY_OPTIONS,
  QUESTION_READINESS_OPTIONS,
  QUESTION_SOURCE_OPTIONS,
} from "@/features/questions/labels";
import { getQuestions } from "@/features/questions/queries";
import { getStoryOptions } from "@/features/stories/queries";

export const metadata: Metadata = { title: "Pertanyaan interview" };

export default function QuestionsPage({
  searchParams,
}: PageProps<"/questions">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pertanyaan interview"
        description="Bank pertanyaan dari catatan interview dan yang kamu tulis sendiri. Tandai mana yang sudah siap."
        actions={
          <Suspense fallback={<Skeleton className="h-9 w-40" />}>
            <AddQuestion />
          </Suspense>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Questions searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AddQuestion() {
  const applications = await getApplicationOptions();

  return <AddQuestionButton options={{ applications }} />;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// searchParams is request-time data, so it is read behind the boundary.
async function Questions({
  searchParams,
}: Pick<PageProps<"/questions">, "searchParams">) {
  const params = await searchParams;
  const [{ total, summary, matches, filter }, applications, stories] =
    await Promise.all([
      getQuestions({
        q: first(params.q),
        category: first(params.category),
        readiness: first(params.readiness),
        source: first(params.source),
        application: first(params.application),
      }),
      getApplicationOptions(),
      getStoryOptions(),
    ]);

  if (total === 0) {
    return (
      <EmptyState
        title="Kumpulkan pertanyaan interview-mu"
        description="Tulis pertanyaan yang pernah atau mungkin ditanyakan. Catatan interview di detail lamaran juga terkumpul di sini."
      >
        <Link
          href="/applications"
          className={buttonVariants({ variant: "outline" })}
        >
          Buka lamaran
        </Link>
      </EmptyState>
    );
  }

  const filtered =
    filter.q !== "" ||
    filter.category !== "" ||
    filter.readiness !== "" ||
    filter.source !== "" ||
    filter.application !== "";

  return (
    <>
      <ReadinessSummaryLine summary={summary} />

      <form className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={filter.q}
            aria-label="Cari pertanyaan, perusahaan, atau posisi"
            placeholder="Cari pertanyaan, perusahaan, atau posisi…"
            className="pl-8"
          />
        </div>
        <select
          name="category"
          defaultValue={filter.category}
          aria-label="Filter kategori"
          className={SELECT_CLASS}
        >
          <option value="">Semua kategori</option>
          {QUESTION_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="readiness"
          defaultValue={filter.readiness}
          aria-label="Filter kesiapan"
          className={SELECT_CLASS}
        >
          <option value="">Semua kesiapan</option>
          {QUESTION_READINESS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="source"
          defaultValue={filter.source}
          aria-label="Filter sumber"
          className={SELECT_CLASS}
        >
          <option value="">Semua sumber</option>
          {QUESTION_SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="application"
          defaultValue={filter.application}
          aria-label="Filter lamaran"
          className={SELECT_CLASS}
        >
          <option value="">Semua lamaran</option>
          {applications.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Cari
        </Button>
        {filtered ? (
          <Link
            href="/questions"
            className={buttonVariants({ variant: "ghost" })}
          >
            Reset
          </Link>
        ) : null}
      </form>

      {matches.length === 0 ? (
        <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Tidak ada pertanyaan yang cocok. Ubah kata kunci atau filter.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <ul className="divide-y">
            {matches.map((question) => (
              <QuestionRow
                key={question.id}
                question={question}
                options={{ applications, stories }}
              />
            ))}
          </ul>
          <p
            className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5"
            aria-live="polite"
          >
            Menampilkan <span className="font-figure">{matches.length}</span>{" "}
            dari <span className="font-figure">{total}</span> pertanyaan
          </p>
        </div>
      )}
    </>
  );
}
