import { PDFParse } from "pdf-parse";

/**
 * Extracts plain text from an uploaded bank statement PDF. This only
 * covers text-based PDFs — a genuine export from a bank's website or app.
 * A scanned/photographed statement (an image with no embedded text layer)
 * comes back with little or no text; the caller (see the parse-statement
 * route) surfaces that as a clear "we couldn't read this" error rather
 * than pretending it worked with zero transactions. OCR support for
 * scanned statements would be a separate, larger feature.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

/**
 * Splits extracted PDF text into line-based chunks small enough for one
 * AI extraction call each (see lib/ai/provider.ts#extractStatementTransactionsFromText),
 * dropping purely blank lines. A little overlap between chunks means a
 * transaction whose fields happen to wrap across a chunk boundary still
 * has a good chance of being read completely in at least one of the two
 * chunks that see it — occasional duplicate extraction is caught
 * downstream (see mergeAndDedupeStatementRows in parse-statement/route.ts),
 * so favoring "might see it twice" over "might miss it" is the right
 * tradeoff here.
 */
export function chunkTextLines(text: string, linesPerChunk = 40, overlapLines = 4): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const chunks: string[] = [];
  const step = Math.max(linesPerChunk - overlapLines, 1);
  for (let i = 0; i < lines.length; i += step) {
    const chunkLines = lines.slice(i, i + linesPerChunk);
    chunks.push(chunkLines.join("\n"));
    if (i + linesPerChunk >= lines.length) break;
  }
  return chunks;
}
