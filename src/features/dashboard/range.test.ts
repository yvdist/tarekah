import { describe, expect, it } from "vitest";
import { resolveRange, todayInJakarta } from "./range";

const TODAY = "2026-10-09";
const ALL_TIME = { from: null, to: null, preset: "all" };

describe("todayInJakarta", () => {
  it("is still the previous day just before midnight WIB", () => {
    expect(todayInJakarta(Date.parse("2026-10-09T16:59:59Z"))).toBe(
      "2026-10-09",
    );
  });

  it("rolls over at midnight WIB, seven hours before UTC", () => {
    expect(todayInJakarta(Date.parse("2026-10-09T17:00:00Z"))).toBe(
      "2026-10-10",
    );
  });

  it("rolls over the year in WIB", () => {
    expect(todayInJakarta(Date.parse("2026-12-31T17:00:00Z"))).toBe(
      "2027-01-01",
    );
  });
});

describe("resolveRange", () => {
  it("defaults to the whole history", () => {
    expect(resolveRange({}, TODAY)).toEqual(ALL_TIME);
  });

  it("resolves 30d to thirty days including today", () => {
    expect(resolveRange({ range: "30d" }, TODAY)).toEqual({
      from: "2026-09-10",
      to: TODAY,
      preset: "30d",
    });
  });

  it("resolves 90d to ninety days including today", () => {
    expect(resolveRange({ range: "90d" }, TODAY)).toEqual({
      from: "2026-07-12",
      to: TODAY,
      preset: "90d",
    });
  });

  it("resolves ytd from the first of January", () => {
    expect(resolveRange({ range: "ytd" }, TODAY)).toEqual({
      from: "2026-01-01",
      to: TODAY,
      preset: "ytd",
    });
  });

  it("crosses a year boundary", () => {
    expect(resolveRange({ range: "30d" }, "2026-01-10").from).toBe(
      "2025-12-12",
    );
  });

  it("resolves all to open bounds", () => {
    expect(resolveRange({ range: "all" }, TODAY)).toEqual(ALL_TIME);
  });

  it("prefers a valid preset over custom dates", () => {
    expect(
      resolveRange(
        { range: "30d", from: "2026-01-01", to: "2026-02-01" },
        TODAY,
      ).preset,
    ).toBe("30d");
  });

  it("falls back to custom dates when the preset is unknown", () => {
    expect(
      resolveRange(
        { range: "7d", from: "2026-01-01", to: "2026-02-01" },
        TODAY,
      ),
    ).toEqual({ from: "2026-01-01", to: "2026-02-01", preset: null });
  });

  it("accepts a range open on one side", () => {
    expect(resolveRange({ from: "2026-03-01" }, TODAY)).toEqual({
      from: "2026-03-01",
      to: null,
      preset: null,
    });
    expect(resolveRange({ to: "2026-03-01" }, TODAY)).toEqual({
      from: null,
      to: "2026-03-01",
      preset: null,
    });
  });

  it("accepts a single day", () => {
    expect(
      resolveRange({ from: "2026-03-01", to: "2026-03-01" }, TODAY),
    ).toEqual({ from: "2026-03-01", to: "2026-03-01", preset: null });
  });

  it("falls back to the whole history when from is after to", () => {
    expect(
      resolveRange({ from: "2026-03-02", to: "2026-03-01" }, TODAY),
    ).toEqual(ALL_TIME);
  });

  it("drops a date that does not parse", () => {
    expect(resolveRange({ from: "kemarin", to: "2026-03-01" }, TODAY)).toEqual({
      from: null,
      to: "2026-03-01",
      preset: null,
    });
    expect(resolveRange({ from: "2026-02-30" }, TODAY)).toEqual(ALL_TIME);
    expect(resolveRange({ from: "'; drop table users; --" }, TODAY)).toEqual(
      ALL_TIME,
    );
  });

  it("uses the first value of a repeated parameter", () => {
    expect(resolveRange({ range: ["90d", "30d"] }, TODAY).preset).toBe("90d");
    expect(
      resolveRange({ from: ["2026-03-01", "2026-04-01"] }, TODAY).from,
    ).toBe("2026-03-01");
  });
});
