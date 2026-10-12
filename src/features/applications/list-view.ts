import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  JOB_SOURCES,
  type JobSource,
  WORK_TYPES,
  type WorkType,
} from "@/db/schema/enum-values";

// The columns the list can be sorted by, under the names the URL uses.
export const SORT_KEYS = ["company", "status", "applied"] as const;

export type SortKey = (typeof SORT_KEYS)[number];

// How the list of applications is narrowed and ordered. It lives in the URL,
// so a reload, a bookmark and the back button all return to the same view.
export type ListView = {
  q: string;
  status: ApplicationStatus | null;
  source: JobSource | null;
  workType: WorkType | null;
  sort: { by: SortKey; desc: boolean } | null;
};

export const EMPTY_LIST_VIEW: ListView = {
  q: "",
  status: null,
  source: null,
  workType: null,
  sort: null,
};

// Longer than any company or position worth searching for.
const QUERY_MAX_LENGTH = 100;

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const oneOf = <T extends string>(
  allowed: ReadonlyArray<T>,
  value: string | undefined,
): T | null => allowed.find((item) => item === value) ?? null;

// Reads a view from the query string. The URL is typed by hand and shared, so
// anything it does not recognize is dropped rather than refused.
export function parseListView(params: Params): ListView {
  const sort = first(params.sort) ?? "";
  const desc = sort.startsWith("-");
  const by = oneOf(SORT_KEYS, desc ? sort.slice(1) : sort);

  return {
    q: (first(params.q) ?? "").trim().slice(0, QUERY_MAX_LENGTH),
    status: oneOf(APPLICATION_STATUSES, first(params.status)),
    source: oneOf(JOB_SOURCES, first(params.source)),
    workType: oneOf(WORK_TYPES, first(params.work)),
    sort: by ? { by, desc } : null,
  };
}

// The query string of a view, "?…" or empty: what is at its default is left
// out, so the plain list keeps its plain address.
export function serializeListView(view: ListView): string {
  const params = new URLSearchParams();
  const q = view.q.trim();

  if (q) {
    params.set("q", q);
  }

  if (view.status) {
    params.set("status", view.status);
  }

  if (view.source) {
    params.set("source", view.source);
  }

  if (view.workType) {
    params.set("work", view.workType);
  }

  if (view.sort) {
    params.set("sort", `${view.sort.desc ? "-" : ""}${view.sort.by}`);
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}
