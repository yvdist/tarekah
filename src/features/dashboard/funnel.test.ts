import { describe, expect, it } from "vitest";
import { withConversion } from "./funnel";

describe("withConversion", () => {
  it("gives each stage the share that reached the next one", () => {
    const stages = [{ count: 42 }, { count: 17 }, { count: 10 }, { count: 0 }];

    expect(withConversion(stages).map((stage) => stage.conversion)).toEqual([
      40,
      59,
      0,
      null,
    ]);
  });

  it("has no conversion for a stage nothing reached", () => {
    expect(withConversion([{ count: 0 }, { count: 0 }])[0].conversion).toBe(
      null,
    );
  });

  it("keeps the other fields of a stage", () => {
    expect(withConversion([{ stage: "applied", count: 3 }])).toEqual([
      { stage: "applied", count: 3, conversion: null },
    ]);
  });

  it("returns nothing for no stages", () => {
    expect(withConversion([])).toEqual([]);
  });
});
