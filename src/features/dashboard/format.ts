// Fixed locale and time zone so server and client render the same text.
const percentFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

const dayFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// A rate is null when nothing was sent, so there is nothing to divide by.
export function formatPercent(value: number | null) {
  return value === null ? "—" : `${percentFormatter.format(value)}%`;
}

export function formatDays(value: number | null) {
  return value === null ? "—" : `${dayFormatter.format(value)} hari`;
}

// For "YYYY-MM-DD" values: "12 Agu".
export function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(`${value}T00:00:00Z`));
}
