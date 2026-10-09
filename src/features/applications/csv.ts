import { SOURCE_LABELS, STATUS_LABELS, WORK_TYPE_LABELS } from "./labels";
import type { ApplicationExportRow } from "./queries";

type Cell = string | number | null;

// Excel only reads UTF-8 correctly when the file starts with a byte order mark.
const BOM = "\uFEFF";

// A spreadsheet runs a cell starting with one of these as a formula. Notes and
// names are free text, so such cells get a leading apostrophe to stay text.
const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value: Cell) {
  if (value === null) {
    return "";
  }

  if (typeof value === "number") {
    return String(value);
  }

  const text = FORMULA_START.test(value) ? `'${value}` : value;

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// RFC 4180: comma-separated, CRLF line endings, quotes doubled inside quotes.
export function toCsv(headers: readonly string[], rows: readonly Cell[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));

  return `${BOM}${lines.join("\r\n")}\r\n`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

// "YYYY-MM-DD HH:mm" in WIB, which spreadsheets parse as a date.
const formatTimestamp = (value: Date | null) =>
  value ? dateTimeFormatter.format(value) : null;

const COLUMNS: ReadonlyArray<
  readonly [header: string, cell: (row: ApplicationExportRow) => Cell]
> = [
  ["Perusahaan", (row) => row.companyName],
  ["Posisi", (row) => row.position],
  ["Status", (row) => STATUS_LABELS[row.status]],
  ["Sumber", (row) => SOURCE_LABELS[row.source]],
  ["Detail sumber", (row) => row.sourceDetail],
  [
    "Tipe kerja",
    (row) => (row.workType ? WORK_TYPE_LABELS[row.workType] : null),
  ],
  ["Lokasi", (row) => row.location],
  ["Gaji minimum", (row) => row.salaryMin],
  ["Gaji maksimum", (row) => row.salaryMax],
  ["Mata uang", (row) => row.salaryCurrency],
  ["Tanggal apply", (row) => row.appliedAt],
  ["Status berubah (WIB)", (row) => formatTimestamp(row.statusChangedAt)],
  ["Follow-up terakhir (WIB)", (row) => formatTimestamp(row.lastFollowedUpAt)],
  ["Versi CV", (row) => row.cvLabel],
  ["Versi cover letter", (row) => row.coverLetterLabel],
  ["Link loker", (row) => row.jobUrl],
  ["Catatan", (row) => row.notes],
  ["Dibuat (WIB)", (row) => formatTimestamp(row.createdAt)],
];

export function applicationsToCsv(rows: readonly ApplicationExportRow[]) {
  return toCsv(
    COLUMNS.map(([header]) => header),
    rows.map((row) => COLUMNS.map(([, cell]) => cell(row))),
  );
}
