import { describe, expect, it } from "vitest";
import { followUpSettingsSchema } from "./schemas";

const errorsOf = (followUpAfterDays: string, ghostedAfterDays: string) => {
  const result = followUpSettingsSchema.safeParse({
    followUpAfterDays,
    ghostedAfterDays,
  });

  // A value that is not a number also fails the comparison between the two
  // fields, so the same field can be reported twice.
  return result.success
    ? []
    : [...new Set(result.error.issues.map((issue) => issue.path[0]))];
};

describe("followUpSettingsSchema", () => {
  it("turns the form strings into numbers", () => {
    expect(
      followUpSettingsSchema.parse({
        followUpAfterDays: " 7 ",
        ghostedAfterDays: "21",
      }),
    ).toEqual({ followUpAfterDays: 7, ghostedAfterDays: 21 });
  });

  it("accepts the bounds 1 and 365", () => {
    expect(errorsOf("1", "365")).toEqual([]);
  });

  it("rejects zero and anything above 365", () => {
    expect(errorsOf("0", "21")).toEqual(["followUpAfterDays"]);
    expect(errorsOf("7", "366")).toEqual(["ghostedAfterDays"]);
  });

  it("rejects values that are not whole numbers", () => {
    expect(errorsOf("", "21")).toEqual(["followUpAfterDays"]);
    expect(errorsOf("7.5", "21")).toEqual(["followUpAfterDays"]);
    expect(errorsOf("-7", "21")).toEqual(["followUpAfterDays"]);
    expect(errorsOf("7", "tiga minggu")).toEqual(["ghostedAfterDays"]);
  });

  it("requires the ghosted threshold to be the larger one", () => {
    expect(errorsOf("7", "7")).toEqual(["ghostedAfterDays"]);
    expect(errorsOf("10", "9")).toEqual(["ghostedAfterDays"]);
    expect(errorsOf("7", "8")).toEqual([]);
  });
});
