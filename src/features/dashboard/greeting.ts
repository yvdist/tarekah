// Fixed locale and time zone so the text does not depend on the server's.
const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Asia/Jakarta",
});

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

// The hour of the day in WIB, 0 to 23. `now` is passed in so the caller
// decides where the clock is read.
export function hourInJakarta(now: number) {
  return Number(hourFormatter.format(new Date(now)));
}

// The dashboard greets in Sundanese, by time of day.
export function greetingFor(hour: number) {
  if (hour >= 4 && hour < 11) {
    return "Wilujeng énjing";
  }

  if (hour >= 11 && hour < 15) {
    return "Wilujeng siang";
  }

  if (hour >= 15 && hour < 19) {
    return "Wilujeng sonten";
  }

  return "Wilujeng wengi";
}

// "Jumat, 9 Okt 2026", in WIB.
export function formatLongDate(now: number) {
  return longDateFormatter.format(new Date(now));
}
