import { describe, expect, it } from "vitest";
import { parseDateTimeLocal, toDateTimeLocalValue } from "./format";

describe("parseDateTimeLocal", () => {
  it("reads the value as WIB", () => {
    expect(parseDateTimeLocal("2026-10-09T09:30").toISOString()).toBe(
      "2026-10-09T02:30:00.000Z",
    );
  });

  it("crosses into the previous UTC day for early hours", () => {
    expect(parseDateTimeLocal("2026-10-09T03:00").toISOString()).toBe(
      "2026-10-08T20:00:00.000Z",
    );
  });

  it("returns an invalid date for an impossible value", () => {
    expect(Number.isNaN(parseDateTimeLocal("2026-13-40T99:99").getTime())).toBe(
      true,
    );
  });
});

describe("toDateTimeLocalValue", () => {
  it("formats a timestamp as a WIB datetime-local value", () => {
    expect(toDateTimeLocalValue(new Date("2026-10-08T20:00:00Z"))).toBe(
      "2026-10-09T03:00",
    );
  });

  it("round-trips with parseDateTimeLocal", () => {
    const value = "2026-12-31T23:45";

    expect(toDateTimeLocalValue(parseDateTimeLocal(value))).toBe(value);
  });
});
