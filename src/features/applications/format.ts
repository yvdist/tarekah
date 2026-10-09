// Fixed locale and time zone so server and client render the same text.
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const numberFormatter = new Intl.NumberFormat("id-ID");

// For `date` columns, which arrive as "YYYY-MM-DD".
export function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : "—";
}

export function formatDateTime(value: Date) {
  return `${dateTimeFormatter.format(value)} WIB`;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Whole days elapsed. `now` is passed in so the caller decides where the clock
// is read (on the server, at request time).
export function daysSince(value: Date, now: number) {
  return Math.max(0, Math.floor((now - value.getTime()) / DAY_IN_MS));
}

export function formatDaysInStatus(days: number) {
  return days === 0 ? "Hari ini" : `${days} hari`;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
) {
  if (min === null && max === null) {
    return "—";
  }

  if (min !== null && max !== null) {
    return min === max
      ? `${currency} ${numberFormatter.format(min)}`
      : `${currency} ${numberFormatter.format(min)} – ${numberFormatter.format(max)}`;
  }

  return min !== null
    ? `Mulai ${currency} ${numberFormatter.format(min)}`
    : `Hingga ${currency} ${numberFormatter.format(max ?? 0)}`;
}
