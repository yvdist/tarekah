import { describe, expect, it } from "vitest";
import {
  daysSince,
  formatDate,
  formatDateTime,
  formatDaysInStatus,
  formatSalary,
} from "./format";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 9, 5);

describe("daysSince", () => {
  it("counts whole days elapsed", () => {
    expect(daysSince(new Date(NOW), NOW)).toBe(0);
    expect(daysSince(new Date(NOW - DAY + 1), NOW)).toBe(0);
    expect(daysSince(new Date(NOW - DAY), NOW)).toBe(1);
    expect(daysSince(new Date(NOW - 30 * DAY), NOW)).toBe(30);
  });

  it("never goes negative", () => {
    expect(daysSince(new Date(NOW + 3 * DAY), NOW)).toBe(0);
  });
});

describe("formatDaysInStatus", () => {
  it("names today and counts the rest", () => {
    expect(formatDaysInStatus(0)).toBe("Hari ini");
    expect(formatDaysInStatus(12)).toBe("12 hari");
  });
});

describe("formatDate", () => {
  it("formats a date column without shifting the day", () => {
    expect(formatDate("2026-08-12")).toBe("12 Agu 2026");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
  });

  it("shows a dash for a missing date", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("shows the time in WIB", () => {
    // 20:30 UTC is 03:30 the next day in Jakarta.
    const text = formatDateTime(new Date("2026-08-12T20:30:00Z"));

    expect(text).toContain("13 Agu 2026");
    expect(text).toContain("03.30");
    expect(text.endsWith(" WIB")).toBe(true);
  });
});

describe("formatSalary", () => {
  it("shows a dash when nothing is known", () => {
    expect(formatSalary(null, null, "IDR")).toBe("—");
  });

  it("shows a single figure when both bounds match", () => {
    expect(formatSalary(8_000_000, 8_000_000, "IDR")).toBe("IDR 8.000.000");
  });

  it("shows a range", () => {
    expect(formatSalary(8_000_000, 12_000_000, "IDR")).toBe(
      "IDR 8.000.000 – 12.000.000",
    );
  });

  it("shows an open-ended lower bound", () => {
    expect(formatSalary(8_000_000, null, "IDR")).toBe("Mulai IDR 8.000.000");
  });

  it("shows an open-ended upper bound", () => {
    expect(formatSalary(null, 12_000_000, "USD")).toBe("Hingga USD 12.000.000");
  });

  it("keeps a zero lower bound", () => {
    expect(formatSalary(0, 5_000_000, "IDR")).toBe("IDR 0 – 5.000.000");
  });
});
