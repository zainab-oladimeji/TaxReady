import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readWorkbookSheets, expandSheetRangeToOrigin } from "@/lib/statement-import/workbook-reader";
import { RawTableRow } from "@/lib/statement-import/apply-mapping";

/**
 * Builds an in-memory workbook (never touches disk) so this test needs no
 * fixture file — and, deliberately, mirrors the general shape of a real
 * bank export (multiple accounts as separate sheets, a few metadata rows
 * before the real header) without embedding anyone's actual statement
 * data in the repo.
 */
function buildWorkbook(sheets: { name: string; rows: (string | number)[][] }[]): Buffer {
  const workbook = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

describe("readWorkbookSheets", () => {
  it("reads a single-sheet workbook into arrays of cells", () => {
    const buffer = buildWorkbook([
      {
        name: "Transactions",
        rows: [
          ["date", "description", "amount", "type"],
          ["2026-08-01", "Office Rent", 350000, "DEBIT"],
          ["2026-08-03", "Client Payment", 180000, "CREDIT"]
        ]
      }
    ]);

    const sheets = readWorkbookSheets(buffer);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].sheetName).toBe("Transactions");
    expect(sheets[0].rows[0]).toEqual(["date", "description", "amount", "type"]);
    expect(sheets[0].rows).toHaveLength(3);
  });

  it("reads every sheet of a multi-account statement (Wallet + Savings style)", () => {
    const buffer = buildWorkbook([
      {
        name: "Wallet Account Transactions",
        rows: [
          ["Wallet Account Statement", "", "", ""],
          ["Account Name", "Example Business", "", ""],
          ["Trans. Date", "Description", "Debit(NGN)", "Credit(NGN)"],
          ["05 Jan 2026", "Transfer to X", 3000, ""]
        ]
      },
      {
        name: "Savings Account Transactions",
        rows: [
          ["Savings Account Statement", "", "", ""],
          ["Trans. Date", "Description", "Debit(NGN)", "Credit(NGN)"],
          ["18 Feb 2026", "Auto-save", "", 5835.96]
        ]
      }
    ]);

    const sheets = readWorkbookSheets(buffer);
    expect(sheets.map((s) => s.sheetName)).toEqual(["Wallet Account Transactions", "Savings Account Transactions"]);
    expect(sheets[0].rows).toHaveLength(4);
    expect(sheets[1].rows).toHaveLength(3);
  });

  it("skips sheets with no rows", () => {
    const buffer = buildWorkbook([
      { name: "Empty", rows: [] },
      { name: "HasData", rows: [["a", "b"]] }
    ]);

    const sheets = readWorkbookSheets(buffer);
    expect(sheets.map((s) => s.sheetName)).toEqual(["HasData"]);
  });

  it("reads rows above the sheet's declared dimension start (real-world export quirk)", () => {
    // Some bank export tools write a sheet whose declared dimension
    // (`!ref`, e.g. "A10:H880") starts partway down even though earlier
    // rows have real data — confirmed against an actual bank statement
    // during development. Build a sheet object directly (rather than
    // through XLSX.write, which recomputes the dimension correctly and
    // would mask the exact bug being guarded against here) with cells
    // above the declared range, and confirm expandSheetRangeToOrigin
    // makes them visible to sheet_to_json.
    const sheet: XLSX.WorkSheet = {
      A1: { t: "s", v: "Account Statement" },
      A3: { t: "s", v: "date" },
      B3: { t: "s", v: "description" },
      A4: { t: "s", v: "2026-08-01" },
      B4: { t: "s", v: "Office Rent" },
      // Declared range starts at row 3 (0-indexed) — rows 0-2 are
      // genuinely present above but outside this declared range, exactly
      // like the real export that prompted this fix.
      "!ref": "A3:B4"
    };

    expandSheetRangeToOrigin(sheet);
    expect(sheet["!ref"]).toBe("A1:B4");

    const rows = XLSX.utils.sheet_to_json<RawTableRow>(sheet, { header: 1, raw: false, defval: "", blankrows: false });
    expect(rows[0]).toEqual(["Account Statement", ""]);
    expect(rows[1]).toEqual(["date", "description"]);
    expect(rows[2]).toEqual(["2026-08-01", "Office Rent"]);
  });
});
