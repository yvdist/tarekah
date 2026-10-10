import { describe, expect, it } from "vitest";
import type { QuestionReadiness } from "@/db/schema/enum-values";
import { groupSameQuestions, normalizeQuestionText } from "./same-question";

describe("normalizeQuestionText", () => {
  it.each([
    ["Apa yang kamu pelajari?", "apa yang kamu pelajari"],
    ["  APA   yang\nkamu pelajari ?! ", "apa yang kamu pelajari"],
    ["Apa itu CAP theorem", "apa itu cap theorem"],
  ])("reads %j as %j", (text, normalized) => {
    expect(normalizeQuestionText(text)).toBe(normalized);
  });
});

const question = (
  id: string,
  text: string,
  readiness: QuestionReadiness = "not_ready",
  stories: string[] = [],
) => ({ id, text, readiness, stories });

describe("groupSameQuestions", () => {
  it("folds the rows that ask the same question into one", () => {
    const groups = groupSameQuestions([
      question("a", "Bagaimana cara mencegah N+1 query?"),
      question("b", "Jelaskan event loop."),
      question("c", "bagaimana cara  mencegah n+1 query"),
      question("d", "Bagaimana cara mencegah N+1 query?"),
    ]);

    expect(groups).toMatchObject([
      { id: "a", copies: 3, ids: ["a", "c", "d"] },
      { id: "b", copies: 1, ids: ["b"] },
    ]);
  });

  it("keeps the order of the list, by the first row of each group", () => {
    const groups = groupSameQuestions([
      question("a", "Satu?"),
      question("b", "Dua?"),
      question("c", "Satu?", "ready"),
      question("d", "Tiga?"),
    ]);

    expect(groups.map((group) => group.id)).toEqual(["c", "b", "d"]);
  });

  it("is represented by the most ready row", () => {
    const [group] = groupSameQuestions([
      question("a", "Satu?", "not_ready", ["s1", "s2"]),
      question("b", "Satu?", "ready"),
      question("c", "Satu?", "somewhat"),
    ]);

    expect(group).toMatchObject({ id: "b", readiness: "ready", copies: 3 });
  });

  it("is represented by the row with the most stories among equally ready ones", () => {
    const [group] = groupSameQuestions([
      question("a", "Satu?", "somewhat"),
      question("b", "Satu?", "somewhat", ["s1"]),
      question("c", "Satu?", "somewhat", ["s1"]),
    ]);

    // The first of the two wins the tie.
    expect(group).toMatchObject({ id: "b", stories: ["s1"] });
  });

  it("leaves a bank without repeats as it is", () => {
    const items = [question("a", "Satu?"), question("b", "Dua?")];

    expect(groupSameQuestions(items)).toEqual(
      items.map((item) => ({ ...item, copies: 1, ids: [item.id] })),
    );
    expect(groupSameQuestions([])).toEqual([]);
  });
});
