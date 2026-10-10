import { describe, expect, it } from "vitest";
import {
  storyFilterSchema,
  storyFormSchema,
  type StoryFormInput,
} from "./schemas";

const input = (overrides: Partial<StoryFormInput> = {}): StoryFormInput => ({
  title: "Migrasi monolith ke service",
  situation: "",
  task: "",
  action: "",
  result: "",
  competencies: [],
  ...overrides,
});

const errorsOf = (overrides: Partial<StoryFormInput>) => {
  const result = storyFormSchema.safeParse(input(overrides));

  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);
};

describe("storyFormSchema", () => {
  it("keeps a title-only draft and nulls the empty parts", () => {
    expect(storyFormSchema.parse(input({ title: "  Judul " }))).toEqual({
      title: "Judul",
      situation: null,
      task: null,
      action: null,
      result: null,
      competencies: [],
    });
  });

  it("requires the title and limits every part", () => {
    expect(errorsOf({ title: " " })).toEqual(["title"]);
    expect(
      errorsOf({
        situation: "a".repeat(5001),
        task: "a".repeat(5001),
        action: "a".repeat(5001),
        result: "a".repeat(5001),
      }),
    ).toEqual(["situation", "task", "action", "result"]);
  });

  it("dedupes competencies and rejects unknown ones", () => {
    expect(
      storyFormSchema.parse(input({ competencies: ["impact", "impact"] }))
        .competencies,
    ).toEqual(["impact"]);
    expect(
      errorsOf({
        competencies: ["charisma" as StoryFormInput["competencies"][number]],
      }),
    ).toEqual(["competencies"]);
  });
});

describe("storyFilterSchema", () => {
  it("falls back to no filter for unknown URL values", () => {
    expect(
      storyFilterSchema.parse({ q: "monolith", competency: "charisma" }),
    ).toEqual({ q: "monolith", competency: "" });
    expect(storyFilterSchema.parse({})).toEqual({ q: "", competency: "" });
  });
});
