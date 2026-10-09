import { describe, expect, it } from "vitest";
import {
  applicationFormSchema,
  applicationIdSchema,
  applicationStatusSchema,
  type ApplicationFormInput,
} from "./schemas";

const ID = "3f2b8c1e-6a4d-4e9b-8f27-5d1c0a9b7e63";

const input = (
  overrides: Partial<ApplicationFormInput> = {},
): ApplicationFormInput => ({
  companyName: "Tokopedia",
  position: "Frontend Engineer",
  jobUrl: "",
  source: "linkedin",
  sourceDetail: "",
  salaryMin: "",
  salaryMax: "",
  location: "",
  workType: "",
  appliedAt: "",
  status: "wishlist",
  cvDocumentId: "",
  coverLetterDocumentId: "",
  notes: "",
  ...overrides,
});

const errorsOf = (overrides: Partial<ApplicationFormInput>) => {
  const result = applicationFormSchema.safeParse(input(overrides));

  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);
};

describe("applicationFormSchema", () => {
  it("turns empty optional fields into null", () => {
    expect(applicationFormSchema.parse(input())).toEqual({
      companyName: "Tokopedia",
      position: "Frontend Engineer",
      jobUrl: null,
      source: "linkedin",
      sourceDetail: null,
      salaryMin: null,
      salaryMax: null,
      location: null,
      workType: null,
      appliedAt: null,
      status: "wishlist",
      cvDocumentId: null,
      coverLetterDocumentId: null,
      notes: null,
    });
  });

  it("parses a fully filled form", () => {
    const parsed = applicationFormSchema.parse(
      input({
        companyName: "  Tokopedia  ",
        jobUrl: "https://contoh.com/loker",
        salaryMin: "8000000",
        salaryMax: "12000000",
        workType: "remote",
        appliedAt: "2026-10-01",
        status: "applied",
        cvDocumentId: ID,
      }),
    );

    expect(parsed).toMatchObject({
      companyName: "Tokopedia",
      jobUrl: "https://contoh.com/loker",
      salaryMin: 8_000_000,
      salaryMax: 12_000_000,
      workType: "remote",
      appliedAt: "2026-10-01",
      status: "applied",
      cvDocumentId: ID,
    });
  });

  it("requires company name and position", () => {
    expect(errorsOf({ companyName: "   ", position: "" })).toEqual([
      "companyName",
      "position",
    ]);
  });

  it("limits company name and position to 200 characters", () => {
    expect(errorsOf({ companyName: "a".repeat(200) })).toEqual([]);
    expect(errorsOf({ companyName: "a".repeat(201) })).toEqual(["companyName"]);
  });

  it("rejects a salary that is not a whole number", () => {
    expect(errorsOf({ salaryMin: "8.000.000" })).toEqual(["salaryMin"]);
    expect(errorsOf({ salaryMin: "-1" })).toEqual(["salaryMin"]);
    expect(errorsOf({ salaryMax: "8jt" })).toEqual(["salaryMax"]);
  });

  it("rejects a salary beyond the integer column", () => {
    expect(errorsOf({ salaryMax: "2147483647" })).toEqual([]);
    expect(errorsOf({ salaryMax: "2147483648" })).toEqual(["salaryMax"]);
  });

  it("rejects a maximum salary below the minimum", () => {
    expect(errorsOf({ salaryMin: "10", salaryMax: "9" })).toEqual([
      "salaryMax",
    ]);
  });

  it("accepts equal bounds and a single bound", () => {
    expect(errorsOf({ salaryMin: "10", salaryMax: "10" })).toEqual([]);
    expect(errorsOf({ salaryMin: "10" })).toEqual([]);
    expect(errorsOf({ salaryMax: "10" })).toEqual([]);
  });

  it("rejects values outside the enums", () => {
    expect(
      errorsOf({
        source: "tiktok" as ApplicationFormInput["source"],
        workType: "wfh" as ApplicationFormInput["workType"],
        status: "hired" as ApplicationFormInput["status"],
      }),
    ).toEqual(["source", "workType", "status"]);
  });

  it("rejects an applied date that is not a real ISO date", () => {
    expect(errorsOf({ appliedAt: "01/10/2026" })).toEqual(["appliedAt"]);
    expect(errorsOf({ appliedAt: "2026-02-30" })).toEqual(["appliedAt"]);
  });

  it("rejects a job URL that is not http(s)", () => {
    expect(errorsOf({ jobUrl: "javascript:alert(1)" })).toEqual(["jobUrl"]);
  });

  it("rejects a document id that is not a uuid", () => {
    expect(errorsOf({ cvDocumentId: "1", coverLetterDocumentId: "x" })).toEqual(
      ["cvDocumentId", "coverLetterDocumentId"],
    );
  });

  it("limits notes to 10 000 characters", () => {
    expect(errorsOf({ notes: "a".repeat(10_001) })).toEqual(["notes"]);
  });
});

describe("applicationIdSchema", () => {
  it("accepts only a uuid", () => {
    expect(applicationIdSchema.safeParse(ID).success).toBe(true);
    expect(applicationIdSchema.safeParse("1 or 1=1").success).toBe(false);
    expect(applicationIdSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("applicationStatusSchema", () => {
  it("accepts only a known status", () => {
    expect(applicationStatusSchema.safeParse("technical_test").success).toBe(
      true,
    );
    expect(applicationStatusSchema.safeParse("Technical Test").success).toBe(
      false,
    );
  });
});
