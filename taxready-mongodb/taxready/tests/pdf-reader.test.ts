import { describe, expect, it } from "vitest";
import { chunkTextLines, extractPdfText } from "@/lib/statement-import/pdf-reader";
import { dedupeAdjacentStatementRows } from "@/lib/statement-import/merge-rows";
import { NormalizedStatementRow } from "@/types";

/**
 * Hand-builds a minimal valid PDF containing known text, with no external
 * PDF library or fixture file needed — just enough real PDF structure
 * (objects, a content stream, an xref table) for a real PDF parser to
 * read. Used to prove extractPdfText genuinely extracts text via unpdf,
 * not just that the code compiles — this replaced pdf-parse after it
 * crashed in production with "DOMMatrix is not defined" (pdf-parse wraps
 * pdfjs-dist's canvas-rendering path, which needs a native module Vercel's
 * serverless runtime doesn't provide; unpdf ships a zero-native-dependency
 * serverless build specifically for this).
 */
function buildMinimalPdf(text: string): Buffer {
  const objs: string[] = [];
  objs[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  objs[2] = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  objs[3] =
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> ` +
    `/MediaBox [0 0 400 200] /Contents 5 0 R >>\nendobj\n`;
  objs[4] = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  const content = `BT /F1 12 Tf 10 150 Td (${text}) Tj ET`;
  objs[5] = `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = pdf.length;
    pdf += objs[i];
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

describe("extractPdfText", () => {
  it("extracts real text content from a text-based PDF", async () => {
    const buf = buildMinimalPdf("2026-08-01 Office Rent 350000.00");
    const text = await extractPdfText(buf);
    expect(text).toContain("Office Rent");
    expect(text).toContain("350000.00");
  });
});

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
