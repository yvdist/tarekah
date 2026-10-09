import { describe, expect, it } from "vitest";
import { documentFormSchema, type DocumentFormInput } from "./schemas";

const input = (
  overrides: Partial<DocumentFormInput> = {},
): DocumentFormInput => ({
  type: "cv",
  label: "CV Backend v3",
  url: "",
  notes: "",
  ...overrides,
});

const errorsOf = (overrides: Partial<DocumentFormInput>) => {
  const result = documentFormSchema.safeParse(input(overrides));

  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);
};

describe("documentFormSchema", () => {
  it("turns empty optional fields into null", () => {
    expect(documentFormSchema.parse(input())).toEqual({
      type: "cv",
      label: "CV Backend v3",
      url: null,
      notes: null,
    });
  });

  it("requires a known type and a label", () => {
    expect(
      errorsOf({ type: "portfolio" as DocumentFormInput["type"], label: "  " }),
    ).toEqual(["type", "label"]);
  });

  it("limits the label to 100 characters", () => {
    expect(errorsOf({ label: "a".repeat(100) })).toEqual([]);
    expect(errorsOf({ label: "a".repeat(101) })).toEqual(["label"]);
  });

  it("rejects a URL that is not http(s)", () => {
    expect(errorsOf({ url: "file:///Users/saya/cv.pdf" })).toEqual(["url"]);
  });
});
