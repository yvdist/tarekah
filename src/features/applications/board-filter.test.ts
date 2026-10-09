import { describe, expect, it } from "vitest";
import {
  EMPTY_BOARD_FILTER,
  filterBoardItems,
  isBoardFiltered,
} from "./board-filter";

const items = [
  {
    companyName: "Arunika Labs",
    position: "Frontend Engineer",
    source: "referral",
  },
  {
    companyName: "Tirta Logistik",
    position: "Backend Developer",
    source: "linkedin",
  },
  {
    companyName: "Kanaya Health",
    position: "React Engineer",
    source: "linkedin",
  },
] as const;

const names = (result: ReadonlyArray<{ companyName: string }>) =>
  result.map((item) => item.companyName);

describe("filterBoardItems", () => {
  it("keeps everything when the filter is empty", () => {
    expect(filterBoardItems([...items], EMPTY_BOARD_FILTER)).toHaveLength(3);
  });

  it("matches the company or the position, ignoring case and outer spaces", () => {
    expect(
      names(filterBoardItems([...items], { query: " tirta ", source: "all" })),
    ).toEqual(["Tirta Logistik"]);
    expect(
      names(filterBoardItems([...items], { query: "ENGINEER", source: "all" })),
    ).toEqual(["Arunika Labs", "Kanaya Health"]);
  });

  it("narrows by source, together with the search", () => {
    expect(
      names(filterBoardItems([...items], { query: "", source: "linkedin" })),
    ).toEqual(["Tirta Logistik", "Kanaya Health"]);
    expect(
      names(
        filterBoardItems([...items], { query: "react", source: "linkedin" }),
      ),
    ).toEqual(["Kanaya Health"]);
    expect(
      filterBoardItems([...items], { query: "react", source: "referral" }),
    ).toEqual([]);
  });
});

describe("isBoardFiltered", () => {
  it("is false for the empty filter and for a blank search", () => {
    expect(isBoardFiltered(EMPTY_BOARD_FILTER)).toBe(false);
    expect(isBoardFiltered({ query: "  ", source: "all" })).toBe(false);
  });

  it("is true once a search or a source is set", () => {
    expect(isBoardFiltered({ query: "a", source: "all" })).toBe(true);
    expect(isBoardFiltered({ query: "", source: "glints" })).toBe(true);
  });
});
