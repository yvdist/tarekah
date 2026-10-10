import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { ListSkeleton } from "@/components/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAiStatus } from "@/features/ai/queries";
import { RandomQuestionButton } from "@/features/practice/components/random-question-button";
import { SessionHistory } from "@/features/practice/components/session-history";
import { getPracticeQuestions } from "@/features/practice/queries";
import { ReadinessSummaryLine } from "@/features/questions/components/readiness-summary";
import {
  QUESTION_CATEGORY_LABELS,
  QUESTION_CATEGORY_OPTIONS,
  QUESTION_READINESS_LABELS,
} from "@/features/questions/labels";

export const metadata: Metadata = { title: "Latihan" };

export default function PracticePage({ searchParams }: PageProps<"/practice">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Latihan"
        description="Latih satu pertanyaan, atau jalani satu interview utuh. Yang kamu dapat catatan untuk mempertajam jawaban, tanpa skor."
        actions={
          <Suspense fallback={<Skeleton className="h-9 w-56" />}>
            <StartButton />
          </Suspense>
        }
      />
      <Panel
        title="Simulasi interview"
        action={
          <Link
            href="/practice/simulation/new"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Atur simulasi
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          AI menjadi interviewer: satu pertanyaan tiap giliran, dan catatan baru
          muncul setelah sesi selesai.
        </p>
        <Suspense fallback={<ListSkeleton rows={2} bare />}>
          <SessionHistory />
        </Suspense>
      </Panel>
      <Suspense fallback={<ListSkeleton />}>
        <PracticeList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Starts with a question the user has not marked ready, while there is one.
async function StartButton() {
  const { total, summary, matches } = await getPracticeQuestions();

  if (total === 0) {
    return null;
  }

  return (
    <RandomQuestionButton
      items={matches.map(({ id, readiness }) => ({ id, readiness }))}
    >
      {summary.not_ready > 0
        ? "Mulai dari yang belum siap"
        : "Latih satu pertanyaan"}
    </RandomQuestionButton>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// searchParams is request-time data, so it is read behind the boundary.
async function PracticeList({
  searchParams,
}: Pick<PageProps<"/practice">, "searchParams">) {
  const params = await searchParams;
  const [{ total, summary, matches, category }, ai] = await Promise.all([
    getPracticeQuestions(first(params.category)),
    getAiStatus(),
  ]);

  if (total === 0) {
    return (
      <EmptyState
        title="Mulai dari satu pertanyaan"
        description="Latihan memakai bank pertanyaanmu. Tulis satu pertanyaan yang paling kamu khawatirkan, lalu kembali ke sini."
      >
        <Link href="/questions" className={buttonVariants()}>
          Buka bank pertanyaan
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <ReadinessSummaryLine summary={summary} />
        {ai.ready ? null : (
          <p className="text-sm text-muted-foreground">
            Belum ada key AI yang aktif. Jawabanmu tetap tersimpan; masukan
            muncul setelah key diatur di{" "}
            <Link
              href="/settings#ai"
              className="text-foreground underline underline-offset-4"
            >
              Pengaturan
            </Link>
            .
          </p>
        )}
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <select
          name="category"
          defaultValue={category}
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
        <Button type="submit" variant="outline">
          Terapkan
        </Button>
        {category !== "" ? (
          <Link
            href="/practice"
            className={buttonVariants({ variant: "ghost" })}
          >
            Reset
          </Link>
        ) : null}
      </form>

      {matches.length === 0 ? (
        <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Belum ada pertanyaan di kategori ini. Pilih kategori lain.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <ul className="divide-y">
            {matches.map((question) => (
              <li
                key={question.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
              >
                <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
                  <p className="text-sm break-words">{question.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {QUESTION_CATEGORY_LABELS[question.category]} ·{" "}
                    {QUESTION_READINESS_LABELS[question.readiness]}
                    {question.stories.length > 0
                      ? ` · ${question.stories.length} cerita`
                      : null}
                    {question.copies > 1
                      ? ` · muncul ${question.copies} kali di bank`
                      : null}
                  </p>
                </div>
                <Link
                  href={`/practice/drill/${question.id}`}
                  aria-label={`Latih pertanyaan: ${shorten(question.text)}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Latih
                </Link>
              </li>
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

const shorten = (text: string) =>
  text.length > 60 ? `${text.slice(0, 57)}…` : text;
