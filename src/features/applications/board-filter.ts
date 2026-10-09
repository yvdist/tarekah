import type { JobSource } from "@/db/schema/enum-values";

export type BoardFilter = { query: string; source: JobSource | "all" };

export const EMPTY_BOARD_FILTER: BoardFilter = { query: "", source: "all" };

export function isBoardFiltered(filter: BoardFilter) {
  return filter.query.trim() !== "" || filter.source !== "all";
}

// Narrows the cards on the board. The search matches the company or the
// position, ignoring case.
export function filterBoardItems<
  T extends { companyName: string; position: string; source: JobSource },
>(items: T[], filter: BoardFilter): T[] {
  const query = filter.query.trim().toLocaleLowerCase("id-ID");

  return items.filter(
    (item) =>
      (filter.source === "all" || item.source === filter.source) &&
      (query === "" ||
        item.companyName.toLocaleLowerCase("id-ID").includes(query) ||
        item.position.toLocaleLowerCase("id-ID").includes(query)),
  );
}
