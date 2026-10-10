import { describe, expect, it } from "vitest";
import { pickQuestionId } from "./pick";

const items = [
  { id: "ready-1", readiness: "ready" },
  { id: "not-1", readiness: "not_ready" },
  { id: "some-1", readiness: "somewhat" },
  { id: "not-2", readiness: "not_ready" },
] as const;

describe("pickQuestionId", () => {
  it("picks among the questions that are not ready first", () => {
    expect(pickQuestionId(items, { random: () => 0 })).toBe("not-1");
    expect(pickQuestionId(items, { random: () => 0.5 })).toBe("not-2");
    expect(pickQuestionId(items, { random: () => 0.999 })).toBe("not-2");
  });

  it("stays in range when random returns 1", () => {
    expect(pickQuestionId(items, { random: () => 1 })).toBe("not-2");
  });

  it("skips the excluded question", () => {
    expect(pickQuestionId(items, { excludeId: "not-1", random: () => 0 })).toBe(
      "not-2",
    );
  });

  it("falls back to somewhat ready, then to ready", () => {
    const rest = items.filter((item) => item.readiness !== "not_ready");

    expect(pickQuestionId(rest, { random: () => 0 })).toBe("some-1");
    expect(pickQuestionId(rest, { excludeId: "some-1", random: () => 0 })).toBe(
      "ready-1",
    );
  });

  it("is null when nothing is left", () => {
    expect(pickQuestionId([], { random: () => 0 })).toBeNull();
    expect(
      pickQuestionId([items[0]], { excludeId: "ready-1", random: () => 0 }),
    ).toBeNull();
  });
});
