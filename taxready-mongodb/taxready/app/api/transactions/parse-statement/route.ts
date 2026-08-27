import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { captureError } from "@/lib/monitoring";
import { getAIProvider } from "@/lib/ai";
import { mapWithConcurrency } from "@/lib/concurrency";
import { readWorkbookSheets } from "@/lib/statement-import/workbook-reader";
import { applyColumnMapping, RawTableRow } from "@/lib/statement-import/apply-mapping";
import { extractPdfText, chunkTextLines } from "@/lib/statement-import/pdf-reader";
import { dedupeAdjacentStatementRows } from "@/lib/statement-import/merge-rows";
import {
  isAllowedStatementMimeType,
  isStatementBase64WithinSizeLimit,
  MAX_STATEMENT_FILE_MB
} from "@/lib/validation/statement";
import { NormalizedStatementRow } from "@/types";

/**
 * Turns an uploaded bank statement — .xlsx/.xls or a text-based PDF —
 * into the same {date, description, amount, type} row shape the CSV
 * import already produces (see components/dashboard/import-csv-modal.tsx),
 * so everything downstream (the background classify+import pipeline in
 * app/api/transactions/import) is unchanged regardless of which file
 * type the person uploaded.
 *
 * Excel/CSV: one AI call per sheet to detect the column layout
 * (lib/ai/provider.ts#detectStatementColumns), then the FULL sheet is
 * processed deterministically in code (lib/statement-import/apply-
 * mapping.ts) — no AI cost or latency scales with row count.
 *
 * PDF: no reliable column structure to detect once and reuse, so each
 * chunk of extracted text is read directly by the AI
 * (detectStatementTransactionsFromText). This does scale with document
 * length — see PDF_CHUNK_CAP below for the current bound.
 */

const SAMPLE_ROWS_FOR_DETECTION = 25;
const PDF_CHUNK_CAP = 150; // ~150 chunks * ~36 new lines/chunk ≈ 5,400 lines of statement text

const bodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string(),
  base64: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { fileName, mimeType, base64 } = parsed.data;

  if (!isAllowedStatementMimeType(mimeType)) {
    return NextResponse.json(
      { error: "That file type isn't supported. Upload an Excel (.xlsx/.xls) or PDF bank statement, or a CSV." },
      { status: 400 }
    );
  }
  if (!isStatementBase64WithinSizeLimit(base64)) {
    return NextResponse.json(
      { error: `That file is too large. Please upload a statement under ${MAX_STATEMENT_FILE_MB}MB.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(base64, "base64");
  const provider = await getAIProvider();
  const warnings: string[] = [];
  let rows: NormalizedStatementRow[] = [];

  try {
    if (mimeType === "application/pdf") {
      const result = await parsePdfStatement(buffer, fileName, provider, warnings);
      rows = result;
    } else {
      const result = await parseSpreadsheetStatement(buffer, fileName, provider, warnings);
      rows = result;
    }
  } catch (err) {
    captureError("[api/transactions/parse-statement] failed", err);
    return NextResponse.json(
      { error: "We couldn't read this statement. Double-check the file, or try exporting it as CSV instead." },
      { status: 422 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          warnings.length > 0
            ? `We couldn't find any transactions in this file. ${warnings[0]}`
            : "We couldn't find any transactions in this file."
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ rows, warnings, totalExtracted: rows.length });
}

// PDF extraction in particular can take a while (many sequential/limited-
// concurrency AI calls) — give this real headroom rather than the
// platform default. Excel/CSV parsing finishes in a couple of seconds
// regardless (see parseSpreadsheetStatement) since it's mostly one AI
// call per sheet plus fast deterministic row processing.
export const maxDuration = 300;

async function parseSpreadsheetStatement(
  buffer: Buffer,
  fileName: string,
  provider: Awaited<ReturnType<typeof getAIProvider>>,
  warnings: string[]
): Promise<NormalizedStatementRow[]> {
  const sheets = readWorkbookSheets(buffer);
  if (sheets.length === 0) {
    warnings.push("The workbook appears to have no data in any sheet.");
    return [];
  }

  const allRows: NormalizedStatementRow[] = [];

  for (const sheet of sheets) {
    const sample = sheet.rows.slice(0, SAMPLE_ROWS_FOR_DETECTION);
    let mapping;
    try {
      mapping = await provider.detectStatementColumns(sample, { fileName, sheetName: sheet.sheetName });
    } catch (err) {
      warnings.push(`Couldn't determine the column layout for sheet "${sheet.sheetName}" — it was skipped.`);
      captureError(`[parse-statement] detectStatementColumns failed for sheet "${sheet.sheetName}"`, err);
      continue;
    }

    if (mapping.confidence < 0.5) {
      warnings.push(
        `Low confidence reading sheet "${sheet.sheetName}" — please double check the imported rows for this sheet.`
      );
    }

    const { rows, skippedRowCount } = applyColumnMapping(sheet.rows as RawTableRow[], mapping);
    allRows.push(...rows);

    if (skippedRowCount > 0) {
      warnings.push(`${skippedRowCount} row(s) in sheet "${sheet.sheetName}" couldn't be read and were skipped.`);
    }
  }

  return allRows;
}

async function parsePdfStatement(
  buffer: Buffer,
  fileName: string,
  provider: Awaited<ReturnType<typeof getAIProvider>>,
  warnings: string[]
): Promise<NormalizedStatementRow[]> {
  const text = await extractPdfText(buffer);

  if (text.trim().length < 50) {
    warnings.push(
      "This PDF doesn't seem to contain readable text — it may be a scanned image. " +
        "Try exporting your statement as Excel or CSV instead."
    );
    return [];
  }

  let chunks = chunkTextLines(text);
  if (chunks.length > PDF_CHUNK_CAP) {
    warnings.push(
      `This statement is very long (${chunks.length} sections of text) — only the first ${PDF_CHUNK_CAP} were processed. ` +
        "Consider exporting a shorter date range, or as Excel/CSV, to import the rest."
    );
    chunks = chunks.slice(0, PDF_CHUNK_CAP);
  }

  let failedChunkCount = 0;
  const chunkResults = await mapWithConcurrency(chunks, 5, async (chunk) => {
    try {
      return await provider.extractStatementTransactionsFromText(chunk, { fileName });
    } catch (err) {
      failedChunkCount++;
      captureError("[parse-statement] extractStatementTransactionsFromText failed for a chunk", err);
      return [] as NormalizedStatementRow[];
    }
  });

  if (failedChunkCount > 0) {
    warnings.push(
      `${failedChunkCount} section(s) of the PDF couldn't be read and may be missing from the import — ` +
        "please review the totals against your original statement."
    );
  }

  return dedupeAdjacentStatementRows(chunkResults.flat());
}
