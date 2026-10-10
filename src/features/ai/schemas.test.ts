import { describe, expect, it } from "vitest";
import { aiCredentialFormSchema } from "./schemas";

const valid = {
  provider: "anthropic",
  apiKey: "sk-ant-api03-not-a-real-key-0123456789",
  model: "claude-sonnet-5-5",
};

const errorsOf = (input: unknown) =>
  aiCredentialFormSchema
    .safeParse(input)
    .error?.issues.map((issue) => issue.path[0]);

describe("aiCredentialFormSchema", () => {
  it("accepts a provider, a key and a model", () => {
    expect(aiCredentialFormSchema.parse(valid)).toEqual(valid);
  });

  it("trims the key and the model", () => {
    expect(
      aiCredentialFormSchema.parse({
        ...valid,
        apiKey: `  ${valid.apiKey}\n`,
        model: " gpt-6.1-sol ",
      }),
    ).toMatchObject({ apiKey: valid.apiKey, model: "gpt-6.1-sol" });
  });

  it("lets the key stay empty, for changing only the model", () => {
    expect(aiCredentialFormSchema.parse({ ...valid, apiKey: "" }).apiKey).toBe(
      "",
    );
  });

  it.each([
    ["a short key", { apiKey: "sk-123" }],
    [
      "a key with a space inside",
      { apiKey: "sk-ant-api03 not-a-real-key-0123" },
    ],
    ["a key that is too long", { apiKey: "k".repeat(301) }],
  ])("rejects %s", (_, override) => {
    expect(errorsOf({ ...valid, ...override })).toEqual(["apiKey"]);
  });

  it.each([
    ["an unknown provider", { provider: "mistral" }, "provider"],
    ["an empty model", { model: "" }, "model"],
    ["a model with spaces", { model: "claude sonnet" }, "model"],
    ["a model that is too long", { model: "m".repeat(101) }, "model"],
  ])("rejects %s", (_, override, field) => {
    expect(errorsOf({ ...valid, ...override })).toEqual([field]);
  });

  it("accepts model ids with dots, colons and slashes", () => {
    for (const model of [
      "gemini-3.6-flash",
      "ft:gpt-6-luna:org:name:id",
      "models/gemini-3.1-pro-preview",
    ]) {
      expect(aiCredentialFormSchema.parse({ ...valid, model }).model).toBe(
        model,
      );
    }
  });
});
