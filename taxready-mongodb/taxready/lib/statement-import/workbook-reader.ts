import * as XLSX from "xlsx";
import { RawTableRow } from "./apply-mapping";

export interface StatementSheet {
  sheetName: string;
  rows: RawTableRow[];
}

/**
 * Some real-world bank exports declare a sheet dimension (`!ref`) that
 * starts partway down the sheet — e.g. "A10:H880" — even though the
 * title/account-summary rows above that are genuinely present with real
 * cell data (confirmed against a real statement during development:
 * openpyxl/pandas read those rows fine, but SheetJS's default
 * sheet_to_json silently skips anything outside the declared range).
 * Mutates the sheet in place so its declared range starts at A1 —
 * SheetJS then reads whatever cells actually exist above the original
 * start (blank ones become "" via the defval option, not an error).
 * Split out from readWorkbookSheets so this specific fix is unit
 * testable without needing a real .xlsx file round trip.
 */
export function expandSheetRangeToOrigin(sheet: XLSX.WorkSheet): void {
  if (!sheet["!ref"]) return;
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  range.s.r = 0;
  range.s.c = 0;
  sheet["!ref"] = XLSX.utils.encode_range(range);
}

/**
 * Reads every sheet of an uploaded workbook into plain arrays-of-cells —
 * no assumptions yet about which row is the header or which column is
 * what (see lib/ai/provider.ts#detectStatementColumns for that part).
 *
 * `raw: false` returns each cell using its *displayed* formatting rather
 * than the underlying number — critical for dates: without this, an
 * Excel date cell comes through as a serial number (e.g. 46057) instead
 * of a readable date string, and cellDates below only covers cells
 * Excel itself marked as dates, which bank-export sheets don't always
 * do consistently.
 */
export function readWorkbookSheets(buffer: Buffer): StatementSheet[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    expandSheetRangeToOrigin(sheet);

    const rows = XLSX.utils.sheet_to_json<RawTableRow>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false
    });
    return { sheetName, rows };
  }).filter((s) => s.rows.length > 0);
}
