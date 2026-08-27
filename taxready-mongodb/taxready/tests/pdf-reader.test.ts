import { describe, expect, it } from "vitest";
import { chunkTextLines } from "@/lib/statement-import/pdf-reader";
import { dedupeAdjacentStatementRows } from "@/lib/statement-import/merge-rows";
import { NormalizedStatementRow } from "@/types";

describe("chunkTextLines", () => {
  it("returns an empty array for blank input", () => {
    expect(chunkTextLines("")).toEqual([]);
    expect(chunkTextLines("   \n  \n")).toEqual([]);
  });

  it("returns a single chunk when everything fits", () => {
    const text = Array.from({ length: 10 }, (_, i) => `line ${i}`).join("\n");
    const chunks = chunkTextLines(text, 40, 4);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].split("\n")).toHaveLength(10);
  });

  it("splits long text into overlapping chunks", () => {
    const text = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n");
    const chunks = chunkTextLines(text, 40, 4);
    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk after the first should share its first few lines with
    // the end of the previous chunk (the overlap).
    const firstChunkLines = chunks[0].split("\n");
    const secondChunkLines = chunks[1].split("\n");
    expect(secondChunkLines[0]).toBe(firstChunkLines[firstChunkLines.length - 4]);
  });

  it("drops blank lines", () => {
    const text = "line 1\n\n\nline 2\n   \nline 3";
    const chunks = chunkTextLines(text, 40, 4);
    expect(chunks[0].split("\n")).toEqual(["line 1", "line 2", "line 3"]);
  });
});

describe("dedupeAdjacentStatementRows", () => {
  const row = (overrides: Partial<NormalizedStatementRow> = {}): NormalizedStatementRow => ({
    date: "2026-08-01",
    description: "Test transaction",
    amount: 1000,
    type: "expense",
    ...overrides
  });

  it("removes an exact adjacent duplicate (simulating chunk overlap)", () => {
    const rows = [row(), row(), row({ description: "Different" })];
    expect(dedupeAdjacentStatementRows(rows)).toHaveLength(2);
  });

  it("keeps non-adjacent identical rows (legitimately repeated transactions)", () => {
    const rows = [row(), row({ description: "Something else" }), row()];
    expect(dedupeAdjacentStatementRows(rows)).toHaveLength(3);
  });

  it("keeps rows that differ in any single field", () => {
    const rows = [row(), row({ amount: 2000 }), row({ date: "2026-08-02" }), row({ type: "income" })];
    expect(dedupeAdjacentStatementRows(rows)).toHaveLength(4);
  });
});
