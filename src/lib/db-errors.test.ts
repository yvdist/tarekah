import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./db-errors";

describe("isUniqueViolation", () => {
  it("recognises the Postgres code on the error", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("recognises the code on the cause of a wrapped error", () => {
    const error = new Error("Failed query", { cause: { code: "23505" } });

    expect(isUniqueViolation(error)).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
  });
});
