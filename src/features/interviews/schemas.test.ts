import { describe, expect, it } from "vitest";
import { interviewFormSchema, type InterviewFormInput } from "./schemas";

const input = (
  overrides: Partial<InterviewFormInput> = {},
): InterviewFormInput => ({
  scheduledAt: "2026-10-09T09:30",
  stage: "hr",
  interviewers: "",
  questions: [{ id: "", text: "" }],
  reflection: "",
  ...overrides,
});

const errorsOf = (overrides: Partial<InterviewFormInput>) => {
  const result = interviewFormSchema.safeParse(input(overrides));

  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);
};

describe("interviewFormSchema", () => {
  it("reads the schedule as WIB and nulls empty text", () => {
    const parsed = interviewFormSchema.parse(input());

    expect(parsed.scheduledAt.toISOString()).toBe("2026-10-09T02:30:00.000Z");
    expect(parsed).toMatchObject({
      stage: "hr",
      interviewers: null,
      questions: [],
      reflection: null,
    });
  });

  it("keeps the question rows that have text", () => {
    expect(
      interviewFormSchema.parse(
        input({
          questions: [
            { id: "", text: " Kenapa pindah? " },
            { id: "", text: "" },
          ],
        }),
      ).questions,
    ).toEqual([{ id: null, text: "Kenapa pindah?" }]);
  });

  it("requires the datetime-local format", () => {
    expect(errorsOf({ scheduledAt: "" })).toEqual(["scheduledAt"]);
    expect(errorsOf({ scheduledAt: "2026-10-09" })).toEqual(["scheduledAt"]);
    expect(errorsOf({ scheduledAt: "2026-10-09T09:30:00Z" })).toEqual([
      "scheduledAt",
    ]);
  });

  it("rejects a well-formed but impossible date", () => {
    expect(errorsOf({ scheduledAt: "2026-13-40T99:99" })).toEqual([
      "scheduledAt",
    ]);
  });

  it("rejects an unknown stage", () => {
    expect(errorsOf({ stage: "ceo" as InterviewFormInput["stage"] })).toEqual([
      "stage",
    ]);
  });

  it("limits the free-text fields", () => {
    expect(
      errorsOf({
        interviewers: "a".repeat(501),
        questions: [{ id: "", text: "a".repeat(1001) }],
        reflection: "a".repeat(10_001),
      }),
    ).toEqual(["interviewers", "questions", "reflection"]);
  });
});
