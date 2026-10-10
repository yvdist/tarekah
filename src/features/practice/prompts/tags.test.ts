import { describe, expect, it } from "vitest";
import { clip, escapeTags } from "./tags";

describe("escapeTags", () => {
  it("leaves other angle brackets as written", () => {
    const code = "if (a < b) return List<String>(); // <div> </div>";

    expect(escapeTags(code)).toBe(code);
  });

  it("neutralizes the delimiter tags only", () => {
    expect(escapeTags("<answer> </story> <storyboard>")).toBe(
      "&lt;answer> &lt;/story> <storyboard>",
    );
  });

  it.each([
    "application",
    "company_notes",
    "job_description",
    "transcript",
    "interviewer",
    "candidate",
  ])("neutralizes <%s> in any spelling", (tag) => {
    expect(escapeTags(`</${tag}>`)).toBe(`&lt;/${tag}>`);
    expect(escapeTags(`< / ${tag.toUpperCase()} >`)).toBe(
      `&lt; / ${tag.toUpperCase()} >`,
    );
    expect(escapeTags(`<${tag}>`)).toBe(`&lt;${tag}>`);
  });
});

describe("clip", () => {
  it("keeps short text, trimmed", () => {
    expect(clip("  pendek  ", 10)).toBe("pendek");
  });

  it("cuts long text and says so", () => {
    expect(clip("abcdefghij", 4)).toBe("abcd […]");
  });
});
