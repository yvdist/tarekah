import { describe, expect, it } from "vitest";
import { applicationsToCsv, toCsv } from "./csv";
import type { ApplicationExportRow } from "./queries";

const BOM = "\uFEFF";

describe("toCsv", () => {
  it("starts with a BOM and ends every line with CRLF", () => {
    expect(toCsv(["a", "b"], [["1", "2"]])).toBe(`${BOM}a,b\r\n1,2\r\n`);
  });

  it("writes only the header for no rows", () => {
    expect(toCsv(["a", "b"], [])).toBe(`${BOM}a,b\r\n`);
  });

  it("writes null as an empty cell and numbers as they are", () => {
    expect(toCsv(["a", "b", "c"], [[null, 0, 8000000]])).toBe(
      `${BOM}a,b,c\r\n,0,8000000\r\n`,
    );
  });

  it("quotes cells with commas, quotes and line breaks", () => {
    expect(
      toCsv(["a"], [["PT Maju, Tbk"], ['bilang "halo"'], ["baris 1\nbaris 2"]]),
    ).toBe(
      `${BOM}a\r\n"PT Maju, Tbk"\r\n"bilang ""halo"""\r\n"baris 1\nbaris 2"\r\n`,
    );
  });

  it.each(["=1+1", "+62812", "-5", "@SUM(A1)", "\tx", "\rx"])(
    "keeps %j from running as a formula",
    (value) => {
      const [, line] = toCsv(["a"], [[value]]).split("\r\n");

      expect(line.replace(/^"/, "").startsWith("'")).toBe(true);
    },
  );

  it("neutralises a formula that also needs quoting", () => {
    expect(toCsv(["a"], [['=HYPERLINK("http://x","klik")']])).toBe(
      `${BOM}a\r\n"'=HYPERLINK(""http://x"",""klik"")"\r\n`,
    );
  });

  it("leaves text alone when the sign is not at the start", () => {
    expect(toCsv(["a"], [["C++ / a=b"]])).toBe(`${BOM}a\r\nC++ / a=b\r\n`);
  });
});

describe("applicationsToCsv", () => {
  const row: ApplicationExportRow = {
    companyName: "Tokopedia",
    position: "Frontend Engineer",
    status: "technical_test",
    source: "referral",
    sourceDetail: "Rina",
    workType: "remote",
    location: "Jakarta",
    salaryMin: 8_000_000,
    salaryMax: 12_000_000,
    salaryCurrency: "IDR",
    appliedAt: "2026-10-01",
    statusChangedAt: new Date("2026-10-08T20:30:00Z"),
    lastFollowedUpAt: null,
    cvLabel: "CV Frontend v2",
    coverLetterLabel: null,
    jobUrl: "https://contoh.com/loker",
    notes: "Tes 3 hari",
    jobDescription: "Syarat: Laravel, Postgres",
    createdAt: new Date("2026-09-30T03:00:00Z"),
  };

  it("writes labels instead of enum values and times in WIB", () => {
    const [header, line, rest] = applicationsToCsv([row])
      .slice(1)
      .split("\r\n");

    expect(header.split(",")).toHaveLength(19);
    expect(header.startsWith("Perusahaan,Posisi,Status,Sumber")).toBe(true);
    expect(line).toBe(
      'Tokopedia,Frontend Engineer,Tes teknis,Referral,Rina,Remote,Jakarta,8000000,12000000,IDR,2026-10-01,2026-10-09 03:30,,CV Frontend v2,,https://contoh.com/loker,Tes 3 hari,"Syarat: Laravel, Postgres",2026-09-30 10:00',
    );
    expect(rest).toBe("");
  });

  it("leaves optional columns empty", () => {
    const [, line] = applicationsToCsv([
      {
        ...row,
        sourceDetail: null,
        workType: null,
        location: null,
        salaryMin: null,
        salaryMax: null,
        appliedAt: null,
        cvLabel: null,
        jobUrl: null,
        notes: null,
        jobDescription: null,
      },
    ]).split("\r\n");

    expect(line).toBe(
      "Tokopedia,Frontend Engineer,Tes teknis,Referral,,,,,,IDR,,2026-10-09 03:30,,,,,,,2026-09-30 10:00",
    );
  });
});
