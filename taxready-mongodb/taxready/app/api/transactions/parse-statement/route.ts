import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { captureError } from "@/lib/monitoring";
import { getAIProvider } from "@/lib/ai";
import { readWorkbookSheets } from "@/lib/statement-import/workbook-reader";
import { applyColumnMapping, RawTableRow } from "@/lib/statement-import/apply-mapping";
import {
  isAllowedStatementMimeType,
  isStatementBase64WithinSizeLimit,
  MAX_STATEMENT_FILE_MB
} from "@/lib/validation/statement";
import { NormalizedStatementRow } from "@/types";

/**
 * Turns an uploaded Excel (.xlsx/.xls) bank statement into the same
 * {date, description, amount, type} row shape the CSV import already
 * produces (see components/dashboard/import-csv-modal.tsx), so
 * everything downstream (the background classify+import pipeline in
 * app/api/transactions/import) is unchanged regardless of which file
 * type the person uploaded.
 *
 * One AI call per sheet detects the column layout
 * (lib/ai/provider.ts#detectStatementColumns), then the FULL sheet is
 * processed deterministically in code (lib/statement-import/apply-
 * mapping.ts) — no AI cost or latency scales with row count, which is
 * why this can stay a single synchronous request.
 *
 * PDF statements do NOT go through this route — see
 * app/api/transactions/import-pdf instead. A PDF's total text can need
 * more AI tokens than a free-tier provider's per-minute quota allows to
 * process inside one request, so PDFs run through a background,
 * QStash-driven pipeline instead (this was originally handled here
 * synchronously; see git history for why that didn't hold up in
 * production against a real multi-hundred-transaction statement).
 */

const SAMPLE_ROWS_FOR_DETECTION = 25;

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

  if (mimeType === "application/pdf") {
    return NextResponse.json(
      { error: "PDF statements are handled separately — this endpoint only reads Excel/CSV files." },
      { status: 400 }
    );
  }

  if (!isAllowedStatementMimeType(mimeType)) {
    return NextResponse.json(
      { error: "That file type isn't supported. Upload an Excel (.xlsx/.xls) bank statement, or a CSV." },
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
    rows = await parseSpreadsheetStatement(buffer, fileName, provider, warnings);
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
