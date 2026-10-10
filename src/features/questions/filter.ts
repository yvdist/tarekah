import type {
  QuestionCategory,
  QuestionReadiness,
  QuestionSource,
} from "@/db/schema/enum-values";
import type { QuestionFilter } from "./schemas";

// The shape the filter needs; the list rows carry more.
export type FilterableQuestion = {
  text: string;
  category: QuestionCategory;
  readiness: QuestionReadiness;
  source: QuestionSource;
  applicationId: string | null;
  companyName: string | null;
  position: string | null;
};

// Runs in memory after the cached read, like the other list pages.
export function filterQuestions<T extends FilterableQuestion>(
  items: T[],
  filter: QuestionFilter,
): T[] {
  const keyword = filter.q.trim().toLowerCase();

  return items.filter(
    (item) =>
      (filter.category === "" || item.category === filter.category) &&
      (filter.readiness === "" || item.readiness === filter.readiness) &&
      (filter.source === "" || item.source === filter.source) &&
      (filter.application === "" ||
        item.applicationId === filter.application) &&
      (keyword === "" ||
        [item.text, item.companyName ?? "", item.position ?? ""].some((text) =>
          text.toLowerCase().includes(keyword),
        )),
  );
}

export type ReadinessSummary = Record<QuestionReadiness, number>;

// "X siap · Y cukup · Z belum": counts only, never a percentage.
export function summarizeReadiness(
  items: ReadonlyArray<{ readiness: QuestionReadiness }>,
): ReadinessSummary {
  const summary: ReadinessSummary = { ready: 0, somewhat: 0, not_ready: 0 };

  for (const item of items) {
    summary[item.readiness] += 1;
  }

  return summary;
}
