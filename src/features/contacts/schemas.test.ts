import { describe, expect, it } from "vitest";
import { contactFormSchema, type ContactFormInput } from "./schemas";

const ID_A = "3f2b8c1e-6a4d-4e9b-8f27-5d1c0a9b7e63";
const ID_B = "9a1d2c3b-4e5f-4a6b-9c7d-8e9f0a1b2c3d";

const input = (
  overrides: Partial<ContactFormInput> = {},
): ContactFormInput => ({
  name: "Rina Wijaya",
  role: "recruiter",
  companyId: "",
  email: "",
  linkedinUrl: "",
  notes: "",
  applicationIds: [],
  ...overrides,
});

const errorsOf = (overrides: Partial<ContactFormInput>) => {
  const result = contactFormSchema.safeParse(input(overrides));

  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);
};

describe("contactFormSchema", () => {
  it("turns empty optional fields into null", () => {
    expect(contactFormSchema.parse(input())).toEqual({
      name: "Rina Wijaya",
      role: "recruiter",
      companyId: null,
      email: null,
      linkedinUrl: null,
      notes: null,
      applicationIds: [],
    });
  });

  it("requires a name and a known role", () => {
    expect(
      errorsOf({ name: " ", role: "teman" as ContactFormInput["role"] }),
    ).toEqual(["name", "role"]);
  });

  it("validates the email only when one is given", () => {
    expect(
      contactFormSchema.parse(input({ email: " rina@contoh.com " })).email,
    ).toBe("rina@contoh.com");
    expect(errorsOf({ email: "rina@" })).toEqual(["email"]);
  });

  it("rejects a LinkedIn URL that is not http(s)", () => {
    expect(errorsOf({ linkedinUrl: "linkedin.com/in/rina" })).toEqual([
      "linkedinUrl",
    ]);
  });

  it("removes duplicate application ids", () => {
    expect(
      contactFormSchema.parse(input({ applicationIds: [ID_A, ID_B, ID_A] }))
        .applicationIds,
    ).toEqual([ID_A, ID_B]);
  });

  it("rejects application ids that are not uuids", () => {
    expect(errorsOf({ applicationIds: [ID_A, "2"] })).toEqual([
      "applicationIds",
    ]);
  });

  it("rejects a company id that is not a uuid", () => {
    expect(errorsOf({ companyId: "tokopedia" })).toEqual(["companyId"]);
  });
});
