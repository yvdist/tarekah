import { describe, expect, it } from "vitest";
import {
  COMPANY_NOTES_MAX_LENGTH,
  type CompanyFormInput,
  companyFormSchema,
} from "./schemas";

const errorsOf = (input: CompanyFormInput) => {
  const result = companyFormSchema.safeParse(input);

  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);
};

describe("companyFormSchema", () => {
  it("turns empty fields into null", () => {
    expect(companyFormSchema.parse({ website: " ", notes: "" })).toEqual({
      website: null,
      notes: null,
    });
  });

  it("trims what was written", () => {
    expect(
      companyFormSchema.parse({
        website: " https://contoh.co.id/karier ",
        notes: "  Tim kecil, produk B2B.\n",
      }),
    ).toEqual({
      website: "https://contoh.co.id/karier",
      notes: "Tim kecil, produk B2B.",
    });
  });

  it("accepts only http and https for the website, which is rendered as a link", () => {
    expect(errorsOf({ website: "contoh.co.id", notes: "" })).toEqual([
      "website",
    ]);
    expect(errorsOf({ website: "javascript:alert(1)", notes: "" })).toEqual([
      "website",
    ]);
  });

  it("limits the notes to what the interviewer reads", () => {
    expect(
      errorsOf({ website: "", notes: "a".repeat(COMPANY_NOTES_MAX_LENGTH) }),
    ).toEqual([]);
    expect(
      errorsOf({
        website: "",
        notes: "a".repeat(COMPANY_NOTES_MAX_LENGTH + 1),
      }),
    ).toEqual(["notes"]);
  });
});
