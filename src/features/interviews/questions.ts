// The questions of an interview are one markdown text, one question per line
// or list item. Returns them as separate entries without their list markers.
export function splitQuestions(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").trim())
    .filter((line) => line !== "");
}
