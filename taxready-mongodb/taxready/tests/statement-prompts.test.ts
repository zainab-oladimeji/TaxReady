import { describe, expect, it } from "vitest";
import { validateColumnMapping, validateExtractedRows } from "@/lib/ai/statement-prompts";

describe("validateColumnMapping", () => {
  it("accepts a valid separate_debit_credit mapping", () => {
    const mapping = validateColumnMapping({
      dataStartRowIndex: 7,
      dateColumnIndex: 0,
      descriptionColumnIndex: 2,
      amountMode: "separate_debit_credit",
      debitColumnIndex: 3,
      creditColumnIndex: 4,
      confidence: 0.95
    });
    expect(mapping.amountMode).toBe("separate_debit_credit");
    expect(mapping.debitColumnIndex).toBe(3);
  });

  it("accepts a valid single_with_type_column mapping", () => {
    const mapping = validateColumnMapping({
      dataStartRowIndex: 1,
      dateColumnIndex: 0,
      descriptionColumnIndex: 1,
      amountMode: "single_with_type_column",
      amountColumnIndex: 2,
      typeColumnIndex: 3,
      confidence: 0.9
    });
    expect(mapping.typeColumnIndex).toBe(3);
  });

  it("accepts a valid single_signed mapping", () => {
    const mapping = validateColumnMapping({
      dataStartRowIndex: 1,
      dateColumnIndex: 0,
      descriptionColumnIndex: 1,
      amountMode: "single_signed",
      amountColumnIndex: 2,
      positiveMeans: "income",
      confidence: 0.8
    });
    expect(mapping.positiveMeans).toBe("income");
  });

  it("rejects a non-object response", () => {
    expect(() => validateColumnMapping(null)).toThrow();
    expect(() => validateColumnMapping("not an object")).toThrow();
    expect(() => validateColumnMapping([1, 2, 3])).toThrow(); // an array is typeof "object" but lacks the required fields
  });

  it("rejects a response missing required integer fields", () => {
    expect(() => validateColumnMapping({ amountMode: "single_signed" })).toThrow();
  });

  it("rejects an invalid amountMode", () => {
    expect(() =>
      validateColumnMapping({
        dataStartRowIndex: 1,
        dateColumnIndex: 0,
        descriptionColumnIndex: 1,
        amountMode: "made_up_mode"
      })
    ).toThrow();
  });

  it("rejects separate_debit_credit missing debit/credit columns", () => {
    expect(() =>
      validateColumnMapping({
        dataStartRowIndex: 1,
        dateColumnIndex: 0,
        descriptionColumnIndex: 1,
        amountMode: "separate_debit_credit"
      })
    ).toThrow();
  });

  it("rejects single_with_type_column missing typeColumnIndex", () => {
    expect(() =>
      validateColumnMapping({
        dataStartRowIndex: 1,
        dateColumnIndex: 0,
        descriptionColumnIndex: 1,
        amountMode: "single_with_type_column",
        amountColumnIndex: 2
      })
    ).toThrow();
  });

  it("defaults confidence when missing", () => {
    const mapping = validateColumnMapping({
      dataStartRowIndex: 1,
      dateColumnIndex: 0,
      descriptionColumnIndex: 1,
      amountMode: "separate_debit_credit",
      debitColumnIndex: 2,
      creditColumnIndex: 3
    });
    expect(mapping.confidence).toBe(0.5);
  });
});

describe("validateExtractedRows", () => {
  it("accepts a well-formed transactions array", () => {
    const rows = validateExtractedRows({
      transactions: [
        { date: "2026-08-01", description: "Office Rent", amount: 350000, type: "expense" },
        { date: "2026-08-03", description: "Client Payment", amount: 180000, type: "income" }
      ]
    });
    expect(rows).toHaveLength(2);
  });

  it("returns an empty array for a chunk with no transactions", () => {
    expect(validateExtractedRows({ transactions: [] })).toEqual([]);
  });

  it("throws when the response has no transactions array at all", () => {
    expect(() => validateExtractedRows({ foo: "bar" })).toThrow();
    expect(() => validateExtractedRows(null)).toThrow();
    expect(() => validateExtractedRows("not an object")).toThrow();
  });

  it("silently drops individually malformed entries instead of failing the whole chunk", () => {
    const rows = validateExtractedRows({
      transactions: [
        { date: "2026-08-01", description: "Valid", amount: 1000, type: "expense" },
        { date: "not-a-date", description: "Bad date", amount: 1000, type: "expense" },
        { date: "2026-08-02", description: "", amount: 1000, type: "expense" }, // empty description
        { date: "2026-08-03", description: "Negative amount", amount: -500, type: "expense" },
        { date: "2026-08-04", description: "Bad type", amount: 1000, type: "sideways" },
        { date: "2026-08-05", description: "Zero amount", amount: 0, type: "expense" }
      ]
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Valid");
  });
});
