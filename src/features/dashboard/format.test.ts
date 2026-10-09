import { describe, expect, it } from "vitest";
import { formatDays, formatPercent, formatShortDate } from "./format";

describe("formatPercent", () => {
  it("shows a dash when there is no rate", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("uses an Indonesian decimal comma and at most one decimal", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(33.3)).toBe("33,3%");
    expect(formatPercent(100)).toBe("100%");
  });
});

describe("formatDays", () => {
  it("shows a dash when there is no sample", () => {
    expect(formatDays(null)).toBe("—");
  });

  it("appends the unit", () => {
    expect(formatDays(4.5)).toBe("4,5 hari");
    expect(formatDays(12)).toBe("12 hari");
  });
});

describe("formatShortDate", () => {
  it("formats day and month without shifting the day", () => {
    expect(formatShortDate("2026-08-12")).toBe("12 Agu");
    expect(formatShortDate("2026-01-01")).toBe("1 Jan");
  });
});
