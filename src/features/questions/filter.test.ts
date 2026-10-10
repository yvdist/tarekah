import { describe, expect, it } from "vitest";
import {
  filterQuestions,
  summarizeReadiness,
  type FilterableQuestion,
} from "./filter";
import type { QuestionFilter } from "./schemas";

const APP_A = "6f1a2b3c-4d5e-4f60-8a71-82b93c4d5e6f";
const APP_B = "0f1a2b3c-4d5e-4f60-8a71-82b93c4d5e60";

const ITEMS: FilterableQuestion[] = [
  {
    text: "Ceritakan konflik dengan rekan tim.",
    category: "behavioral",
    readiness: "ready",
    source: "interview",
    applicationId: APP_A,
    companyName: "Tokopedia",
    position: "Backend Engineer",
  },
  {
    text: "Apa itu CAP theorem?",
    category: "system_design",
    readiness: "not_ready",
    source: "manual",
    applicationId: null,
    companyName: null,
    position: null,
  },
  {
    text: "Kenapa pindah?",
    category: "hr_general",
    readiness: "somewhat",
    source: "interview",
    applicationId: APP_B,
    companyName: "Gojek",
    position: "Senior Engineer",
  },
];

const filter = (overrides: Partial<QuestionFilter> = {}): QuestionFilter => ({
  q: "",
  category: "",
  readiness: "",
  source: "",
  application: "",
  ...overrides,
});

const texts = (items: FilterableQuestion[]) => items.map((item) => item.text);

describe("filterQuestions", () => {
  it("returns everything without a filter", () => {
    expect(filterQuestions(ITEMS, filter())).toHaveLength(3);
  });

  it("matches the keyword against the text, company and position", () => {
    expect(texts(filterQuestions(ITEMS, filter({ q: "  CAP " })))).toEqual([
      "Apa itu CAP theorem?",
    ]);
    expect(texts(filterQuestions(ITEMS, filter({ q: "gojek" })))).toEqual([
      "Kenapa pindah?",
    ]);
    expect(texts(filterQuestions(ITEMS, filter({ q: "backend" })))).toEqual([
      "Ceritakan konflik dengan rekan tim.",
    ]);
  });

  it("combines the select filters with and", () => {
    expect(
      texts(filterQuestions(ITEMS, filter({ source: "interview" }))),
    ).toHaveLength(2);
    expect(
      texts(
        filterQuestions(
          ITEMS,
          filter({ source: "interview", readiness: "somewhat" }),
        ),
      ),
    ).toEqual(["Kenapa pindah?"]);
    expect(
      texts(filterQuestions(ITEMS, filter({ category: "system_design" }))),
    ).toEqual(["Apa itu CAP theorem?"]);
    expect(
      texts(filterQuestions(ITEMS, filter({ application: APP_A }))),
    ).toEqual(["Ceritakan konflik dengan rekan tim."]);
  });
});

describe("summarizeReadiness", () => {
  it("counts each readiness, including zero", () => {
    expect(summarizeReadiness(ITEMS)).toEqual({
      ready: 1,
      somewhat: 1,
      not_ready: 1,
    });
    expect(summarizeReadiness([])).toEqual({
      ready: 0,
      somewhat: 0,
      not_ready: 0,
    });
  });
});
