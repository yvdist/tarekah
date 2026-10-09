// Interview times are entered and shown in WIB, like every other timestamp in
// the app.
const WIB_OFFSET = "+07:00";

const dateTimeLocalFormatter = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

// "YYYY-MM-DDTHH:mm" from a datetime-local input, read as WIB.
export function parseDateTimeLocal(value: string) {
  return new Date(`${value}:00${WIB_OFFSET}`);
}

// The inverse, for the default value of a datetime-local input.
export function toDateTimeLocalValue(value: Date) {
  return dateTimeLocalFormatter.format(value).replace(" ", "T");
}
