import { connection } from "next/server";
import { z } from "zod";

export const RANGE_PRESETS = [
  { value: "30d", label: "30 hari" },
  { value: "90d", label: "90 hari" },
  { value: "ytd", label: "Tahun ini" },
  { value: "all", label: "Semua waktu" },
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number]["value"];

// Inclusive bounds on applied_at as "YYYY-MM-DD"; null means open-ended.
export type DateRange = {
  from: string | null;
  to: string | null;
  // The preset this range came from, or null for a custom range.
  preset: RangePreset | null;
};

const ALL_TIME: DateRange = { from: null, to: null, preset: "all" };

const presetSchema = z.enum(RANGE_PRESETS.map((preset) => preset.value));
const dateSchema = z.iso.date();

const jakartaDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeZone: "Asia/Jakarta",
});

// Today's calendar date in WIB as "YYYY-MM-DD". `now` is passed in so the
// caller decides where the clock is read.
export function todayInJakarta(now: number) {
  return jakartaDateFormatter.format(new Date(now));
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);

  return value.toISOString().slice(0, 10);
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | undefined) {
  const parsed = dateSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}

// Presets are relative to today, so this reads the clock. connection() marks
// that as request-time work; without it Next.js rejects Date.now() while
// prerendering.
export async function resolveCurrentRange(
  params: Record<string, string | string[] | undefined>,
) {
  await connection();

  return resolveRange(params, todayInJakarta(Date.now()));
}

// The values come from the URL, so anything that does not parse falls back to
// the whole history instead of failing the page.
export function resolveRange(
  params: Record<string, string | string[] | undefined>,
  today: string,
): DateRange {
  const preset = presetSchema.safeParse(first(params.range));

  if (preset.success) {
    switch (preset.data) {
      case "30d":
        return { from: addDays(today, -29), to: today, preset: "30d" };
      case "90d":
        return { from: addDays(today, -89), to: today, preset: "90d" };
      case "ytd":
        return { from: `${today.slice(0, 4)}-01-01`, to: today, preset: "ytd" };
      case "all":
        return ALL_TIME;
    }
  }

  const from = parseDate(first(params.from));
  const to = parseDate(first(params.to));

  if ((!from && !to) || (from && to && from > to)) {
    return ALL_TIME;
  }

  return { from, to, preset: null };
}
