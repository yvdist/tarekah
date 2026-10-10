import { describe, expect, it } from "vitest";
import {
  interviewQuestionsSchema,
  questionFilterSchema,
  questionFormSchema,
  questionStoryIdsSchema,
  type QuestionFormInput,
} from "./schemas";

const ID = "6f1a2b3c-4d5e-4f60-8a71-82b93c4d5e6f";

const input = (
  overrides: Partial<QuestionFormInput> = {},
): QuestionFormInput => ({
  text: "Ceritakan konflik dengan rekan tim.",
  category: "behavioral",
  applicationId: "",
  notes: "",
  ...overrides,
});

const errorsOf = (overrides: Partial<QuestionFormInput>) => {
  const result = questionFormSchema.safeParse(input(overrides));

  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);
};

describe("questionFormSchema", () => {
  it("trims the text and nulls empty optional fields", () => {
    expect(
      questionFormSchema.parse(input({ text: "  Apa itu CAP?  " })),
    ).toEqual({
      text: "Apa itu CAP?",
      category: "behavioral",
      applicationId: null,
      notes: null,
    });
  });

  it("requires the text and limits it", () => {
    expect(errorsOf({ text: "   " })).toEqual(["text"]);
    expect(errorsOf({ text: "a".repeat(1001) })).toEqual(["text"]);
  });

  it("rejects an unknown category and a malformed application id", () => {
    expect(
      errorsOf({ category: "trivia" as QuestionFormInput["category"] }),
    ).toEqual(["category"]);
    expect(errorsOf({ applicationId: "123" })).toEqual(["applicationId"]);
  });

  it("keeps a well-formed application id", () => {
    expect(
      questionFormSchema.parse(input({ applicationId: ID })),
    ).toMatchObject({ applicationId: ID });
  });
});

describe("interviewQuestionsSchema", () => {
  it("drops blank rows and trims the rest", () => {
    expect(
      interviewQuestionsSchema.parse([
        { id: "", text: "  Pertama " },
        { id: "", text: "   " },
        { id: ID, text: "Kedua" },
      ]),
    ).toEqual([
      { id: null, text: "Pertama" },
      { id: ID, text: "Kedua" },
    ]);
  });

  it("rejects a malformed id, an overlong text and too many rows", () => {
    expect(
      interviewQuestionsSchema.safeParse([{ id: "x", text: "A" }]).success,
    ).toBe(false);
    expect(
      interviewQuestionsSchema.safeParse([{ id: "", text: "a".repeat(1001) }])
        .success,
    ).toBe(false);
    expect(
      interviewQuestionsSchema.safeParse(
        Array.from({ length: 51 }, () => ({ id: "", text: "A" })),
      ).success,
    ).toBe(false);
  });
});

describe("questionStoryIdsSchema", () => {
  it("dedupes and rejects non-uuids", () => {
    expect(questionStoryIdsSchema.parse([ID, ID])).toEqual([ID]);
    expect(questionStoryIdsSchema.safeParse(["nope"]).success).toBe(false);
  });
});

describe("questionFilterSchema", () => {
  it("falls back to no filter for unknown URL values", () => {
    expect(
      questionFilterSchema.parse({
        q: "cap",
        category: "trivia",
        readiness: "ready",
        source: undefined,
        application: "not-a-uuid",
      }),
    ).toEqual({
      q: "cap",
      category: "",
      readiness: "ready",
      source: "",
      application: "",
    });
  });
});
