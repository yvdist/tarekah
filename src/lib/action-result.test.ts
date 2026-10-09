import { describe, expect, it } from "vitest";
import { z } from "zod";
import { invalidResult } from "./action-result";

describe("invalidResult", () => {
  it("returns the messages keyed by field", () => {
    const schema = z.object({
      name: z.string().min(1, "Nama wajib diisi"),
      age: z.number("Isi dengan angka"),
    });
    const parsed = schema.safeParse({ name: "", age: "x" });

    if (parsed.success) {
      throw new Error("Expected the input to be invalid");
    }

    expect(invalidResult(parsed.error)).toEqual({
      ok: false,
      message: "Periksa kembali isian form.",
      fieldErrors: {
        name: ["Nama wajib diisi"],
        age: ["Isi dengan angka"],
      },
    });
  });
});
