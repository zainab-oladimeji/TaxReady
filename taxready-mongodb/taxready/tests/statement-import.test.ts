import { describe, expect, it } from "vitest";
import { applyColumnMapping, RawTableRow } from "@/lib/statement-import/apply-mapping";
import { parseFlexibleAmount } from "@/lib/statement-import/parse-amount";
import { parseFlexibleDate } from "@/lib/statement-import/parse-date";
import { StatementColumnMapping } from "@/types";

describe("parseFlexibleAmount", () => {
  it("parses plain and comma-separated numbers", () => {
    expect(parseFlexibleAmount("45500")).toBe(45500);
    expect(parseFlexibleAmount("45,500.00")).toBe(45500);
    expect(parseFlexibleAmount(45500)).toBe(45500);
  });

  it("strips currency symbols", () => {
    expect(parseFlexibleAmount("₦2,390.96")).toBeCloseTo(2390.96);
    expect(parseFlexibleAmount("$1,200.50")).toBeCloseTo(1200.5);
  });

  it("treats placeholders as no value", () => {
    expect(parseFlexibleAmount("--")).toBeNull();
    expect(parseFlexibleAmount("-")).toBeNull();
    expect(parseFlexibleAmount("")).toBeNull();
    expect(parseFlexibleAmount(null)).toBeNull();
    expect(parseFlexibleAmount(undefined)).toBeNull();
    expect(parseFlexibleAmount("N/A")).toBeNull();
  });

  it("treats parenthesized amounts as negative", () => {
    expect(parseFlexibleAmount("(1,200.00)")).toBe(-1200);
  });
});

describe("parseFlexibleDate", () => {
  it("parses the OPay-style timestamp format", () => {
    expect(parseFlexibleDate("05 Jan 2026 12:53:05")).toBe("2026-01-05");
  });

  it("parses plain ISO dates", () => {
    expect(parseFlexibleDate("2026-08-01")).toBe("2026-08-01");
  });

  it("parses slash-separated dates", () => {
    expect(parseFlexibleDate("31/12/2026")).toBe("2026-12-31");
  });

  it("parses a native Date object (e.g. from an Excel cell)", () => {
    expect(parseFlexibleDate(new Date(Date.UTC(2026, 0, 5)))).toBe("2026-01-05");
  });

  it("returns null for garbage input instead of throwing", () => {
    expect(parseFlexibleDate("not a date")).toBeNull();
    expect(parseFlexibleDate("")).toBeNull();
    expect(parseFlexibleDate(null)).toBeNull();
  });
});

describe("applyColumnMapping", () => {
  it("extracts transactions from a separate debit/credit layout (OPay-style)", () => {
    const mapping: StatementColumnMapping = {
      dataStartRowIndex: 1,
      dateColumnIndex: 0,
      descriptionColumnIndex: 2,
      amountMode: "separate_debit_credit",
      debitColumnIndex: 3,
      creditColumnIndex: 4,
      confidence: 0.95
    };

    const rows: RawTableRow[] = [
      ["Trans. Date", "Value Date", "Description", "Debit(₦)", "Credit(₦)", "Balance After(₦)"],
      ["05 Jan 2026 12:53:05", "05 Jan 2026", "Transfer from X", "--", "1,000.00", "3,390.96"],
      ["05 Jan 2026 17:32:09", "05 Jan 2026", "Transfer to Y", "3,000.00", "--", "390.96"]
    ];

    const result = applyColumnMapping(rows, mapping);
    expect(result.skippedRowCount).toBe(0);
    expect(result.rows).toEqual([
      { date: "2026-01-05", description: "Transfer from X", amount: 1000, type: "income" },
      { date: "2026-01-05", description: "Transfer to Y", amount: 3000, type: "expense" }
    ]);
  });

  it("extracts transactions from a single amount + type-label layout", () => {
    const mapping: StatementColumnMapping = {
      dataStartRowIndex: 1,
      dateColumnIndex: 0,
      descriptionColumnIndex: 1,
      amountMode: "single_with_type_column",
      amountColumnIndex: 2,
      typeColumnIndex: 3,
      confidence: 0.9
    };

    const rows: RawTableRow[] = [
      ["date", "description", "amount", "type"],
      ["2026-08-01", "Shoprite - Inventory Restock", "45500", "DEBIT"],
      ["2026-08-03", "Client Payment - Bulk Order", "180000", "CREDIT"]
    ];

    const result = applyColumnMapping(rows, mapping);
    expect(result.rows).toEqual([
      { date: "2026-08-01", description: "Shoprite - Inventory Restock", amount: 45500, type: "expense" },
      { date: "2026-08-03", description: "Client Payment - Bulk Order", amount: 180000, type: "income" }
    ]);
  });

  it("extracts transactions from a single signed-amount layout", () => {
    const mapping: StatementColumnMapping = {
      dataStartRowIndex: 1,
      dateColumnIndex: 0,
      descriptionColumnIndex: 1,
      amountMode: "single_signed",
      amountColumnIndex: 2,
      positiveMeans: "income",
      confidence: 0.85
    };

    const rows: RawTableRow[] = [
      ["Date", "Description", "Amount"],
      ["2026-08-01", "Office Rent", "-350000"],
      ["2026-08-02", "Client Payment", "500000"]
    ];

    const result = applyColumnMapping(rows, mapping);
    expect(result.rows).toEqual([
      { date: "2026-08-01", description: "Office Rent", amount: 350000, type: "expense" },
      { date: "2026-08-02", description: "Client Payment", amount: 500000, type: "income" }
    ]);
  });

  it("skips rows with no usable date/description/amount and reports the count", () => {
    const mapping: StatementColumnMapping = {
      dataStartRowIndex: 1,
      dateColumnIndex: 0,
      descriptionColumnIndex: 1,
      amountMode: "single_with_type_column",
      amountColumnIndex: 2,
      typeColumnIndex: 3,
      confidence: 0.9
    };

    const rows: RawTableRow[] = [
      ["date", "description", "amount", "type"],
      ["2026-08-01", "Valid row", "1000", "DEBIT"],
      ["not a date", "Bad date row", "1000", "DEBIT"],
      ["2026-08-02", "", "1000", "DEBIT"], // no description
      ["2026-08-03", "No amount here", "", "DEBIT"], // no amount
      ["", "", "", ""] // fully blank row — not counted as skipped
    ];

    const result = applyColumnMapping(rows, mapping);
    expect(result.rows).toHaveLength(1);
    expect(result.skippedRowCount).toBe(3);
  });

  it("ignores metadata rows before dataStartRowIndex", () => {
    const mapping: StatementColumnMapping = {
      dataStartRowIndex: 3,
      dateColumnIndex: 0,
      descriptionColumnIndex: 1,
      amountMode: "single_with_type_column",
      amountColumnIndex: 2,
      typeColumnIndex: 3,
      confidence: 0.9
    };

    const rows: RawTableRow[] = [
      ["Wallet Account Statement", "", "", ""],
      ["Account Name", "ZAINAB OYINKANSOLA OLADIMEJI", "", ""],
      ["date", "description", "amount", "type"],
      ["2026-08-01", "Real transaction", "1000", "DEBIT"]
    ];

    const result = applyColumnMapping(rows, mapping);
    expect(result.rows).toEqual([{ date: "2026-08-01", description: "Real transaction", amount: 1000, type: "expense" }]);
  });
});
