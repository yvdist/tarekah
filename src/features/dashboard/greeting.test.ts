import { describe, expect, it } from "vitest";
import { formatLongDate, greetingFor, hourInJakarta } from "./greeting";

describe("greetingFor", () => {
  it.each([
    [4, "Wilujeng énjing"],
    [10, "Wilujeng énjing"],
    [11, "Wilujeng siang"],
    [14, "Wilujeng siang"],
    [15, "Wilujeng sonten"],
    [18, "Wilujeng sonten"],
    [19, "Wilujeng wengi"],
    [23, "Wilujeng wengi"],
    [0, "Wilujeng wengi"],
    [3, "Wilujeng wengi"],
  ])("greets hour %i with %s", (hour, greeting) => {
    expect(greetingFor(hour)).toBe(greeting);
  });
});

describe("hourInJakarta", () => {
  it("reads the hour in WIB, not UTC", () => {
    expect(hourInJakarta(Date.UTC(2026, 9, 9, 8, 30))).toBe(15);
  });

  it("gives 0 at midnight in WIB", () => {
    expect(hourInJakarta(Date.UTC(2026, 9, 9, 17, 0))).toBe(0);
  });
});

describe("formatLongDate", () => {
  it("writes the weekday and the date in WIB", () => {
    expect(formatLongDate(Date.UTC(2026, 9, 9, 8, 30))).toBe(
      "Jumat, 9 Okt 2026",
    );
  });

  it("is already the next day in WIB late in the UTC evening", () => {
    expect(formatLongDate(Date.UTC(2026, 9, 9, 18, 0))).toBe(
      "Sabtu, 10 Okt 2026",
    );
  });
});
