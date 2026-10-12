import { describe, expect, it } from "vitest";
import {
  EMPTY_LIST_VIEW,
  type ListView,
  parseListView,
  serializeListView,
} from "./list-view";

const view = (overrides: Partial<ListView> = {}): ListView => ({
  ...EMPTY_LIST_VIEW,
  ...overrides,
});

const paramsOf = (query: string) =>
  Object.fromEntries(new URLSearchParams(query));

describe("parseListView", () => {
  it("is the plain list without parameters", () => {
    expect(parseListView({})).toEqual(EMPTY_LIST_VIEW);
  });

  it("reads the search, the filters and the sort", () => {
    expect(
      parseListView({
        q: " tokopedia ",
        status: "interview",
        source: "linkedin",
        work: "remote",
        sort: "-applied",
      }),
    ).toEqual({
      q: "tokopedia",
      status: "interview",
      source: "linkedin",
      workType: "remote",
      sort: { by: "applied", desc: true },
    });
  });

  it("reads an ascending sort", () => {
    expect(parseListView({ sort: "company" }).sort).toEqual({
      by: "company",
      desc: false,
    });
  });

  it("drops what it does not recognize", () => {
    expect(
      parseListView({
        status: "hired",
        source: "friendster",
        work: "moon",
        sort: "-salary",
        page: "2",
      }),
    ).toEqual(EMPTY_LIST_VIEW);
    expect(parseListView({ sort: "-" }).sort).toBeNull();
  });

  it("takes the first of a repeated parameter", () => {
    expect(
      parseListView({ status: ["offer", "rejected"], q: ["a", "b"] }),
    ).toEqual(view({ status: "offer", q: "a" }));
  });

  it("cuts a search that is too long", () => {
    expect(parseListView({ q: "a".repeat(500) }).q).toHaveLength(100);
  });
});

describe("serializeListView", () => {
  it("keeps the plain list at its plain address", () => {
    expect(serializeListView(EMPTY_LIST_VIEW)).toBe("");
    expect(serializeListView(view({ q: "   " }))).toBe("");
  });

  it("writes only what differs from the default", () => {
    expect(serializeListView(view({ status: "applied" }))).toBe(
      "?status=applied",
    );
    expect(
      serializeListView(view({ sort: { by: "status", desc: false } })),
    ).toBe("?sort=status");
  });

  it("encodes a search with spaces and symbols", () => {
    expect(serializeListView(view({ q: "PT Maju & Jaya" }))).toBe(
      "?q=PT+Maju+%26+Jaya",
    );
  });

  it.each<ListView>([
    EMPTY_LIST_VIEW,
    view({ q: "PT Maju & Jaya" }),
    view({
      q: "backend",
      status: "technical_test",
      source: "referral",
      workType: "hybrid",
      sort: { by: "applied", desc: true },
    }),
    view({ sort: { by: "company", desc: false } }),
  ])("reads back what it wrote: %j", (written) => {
    expect(parseListView(paramsOf(serializeListView(written)))).toEqual(
      written,
    );
  });
});
