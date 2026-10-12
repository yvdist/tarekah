import { describe, expect, it } from "vitest";
import { withVerifiedSsl } from "./connection-string";

const HOST =
  "postgres://user:p%40ss@ep-x-pooler.ap-southeast-1.aws.neon.tech/db";

describe("withVerifiedSsl", () => {
  it.each(["prefer", "require", "verify-ca"])(
    "asks for full verification where the string says %s",
    (mode) => {
      expect(
        withVerifiedSsl(`${HOST}?sslmode=${mode}&channel_binding=require`),
      ).toBe(`${HOST}?sslmode=verify-full&channel_binding=require`);
      expect(
        withVerifiedSsl(`${HOST}?connect_timeout=10&sslmode=${mode}`),
      ).toBe(`${HOST}?connect_timeout=10&sslmode=verify-full`);
    },
  );

  it.each([
    `${HOST}?sslmode=verify-full`,
    // What was asked for explicitly stays: no TLS, and libpq's own meaning.
    `${HOST}?sslmode=disable`,
    `${HOST}?uselibpqcompat=true&sslmode=no-verify`,
    // A local database without TLS, as the end-to-end tests use.
    "postgres://postgres:postgres@localhost:54329/postgres",
    "",
  ])("leaves %j alone", (connectionString) => {
    expect(withVerifiedSsl(connectionString)).toBe(connectionString);
  });

  it("does not touch a password that happens to read like the option", () => {
    const url = "postgres://user:sslmode=require@localhost/db";

    expect(withVerifiedSsl(url)).toBe(url);
  });
});
