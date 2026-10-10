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
    expect(pickQuestionId(items, () => 0)).toBe("not-1");
    expect(pickQuestionId(items, () => 0.5)).toBe("not-2");
    expect(pickQuestionId(items, () => 0.999)).toBe("not-2");
  });

  it("stays in range when random returns 1", () => {
    expect(pickQuestionId(items, () => 1)).toBe("not-2");
  });

  it("falls back to somewhat ready, then to ready", () => {
    const rest = items.filter((item) => item.readiness !== "not_ready");

    expect(pickQuestionId(rest, () => 0)).toBe("some-1");
    expect(pickQuestionId([items[0]], () => 0)).toBe("ready-1");
  });

  it("is null when there is nothing to pick", () => {
    expect(pickQuestionId([], () => 0)).toBeNull();
  });
});
