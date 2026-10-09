import { describe, expect, it } from "vitest";
import {
  optionalHttpUrl,
  optionalId,
  optionalText,
  requiredText,
} from "./form-schemas";

describe("optionalText", () => {
  const schema = optionalText(5);

  it("trims and keeps a value", () => {
    expect(schema.parse("  abc ")).toBe("abc");
  });

  it("turns an empty or blank value into null", () => {
    expect(schema.parse("")).toBeNull();
    expect(schema.parse("   ")).toBeNull();
  });

  it("measures the limit after trimming", () => {
    expect(schema.safeParse(" abcde ").success).toBe(true);
    expect(schema.safeParse("abcdef").success).toBe(false);
  });
});

describe("requiredText", () => {
  const schema = requiredText(5, "Wajib diisi");

  it("rejects a blank value with the given message", () => {
    const result = schema.safeParse("   ");

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Wajib diisi");
  });

  it("trims a value", () => {
    expect(schema.parse(" abc ")).toBe("abc");
  });
});

describe("optionalHttpUrl", () => {
  const schema = optionalHttpUrl("https://contoh.com");

  it("accepts http and https URLs", () => {
    expect(schema.parse("https://contoh.com/loker?id=1")).toBe(
      "https://contoh.com/loker?id=1",
    );
    expect(schema.safeParse("http://contoh.com").success).toBe(true);
  });

  it("turns an empty value into null", () => {
    expect(schema.parse("  ")).toBeNull();
  });

  // The value is rendered as a link, so other schemes must not get through.
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://contoh.com/cv.pdf",
    "contoh.com",
    "//contoh.com",
  ])("rejects %s", (value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});

describe("optionalId", () => {
  it("accepts a uuid", () => {
    const id = "3f2b8c1e-6a4d-4e9b-8f27-5d1c0a9b7e63";

    expect(optionalId.parse(id)).toBe(id);
  });

  it("turns the empty option into null", () => {
    expect(optionalId.parse("")).toBeNull();
  });

  it("rejects anything else", () => {
    expect(optionalId.safeParse("1").success).toBe(false);
    expect(optionalId.safeParse("null").success).toBe(false);
  });
});
