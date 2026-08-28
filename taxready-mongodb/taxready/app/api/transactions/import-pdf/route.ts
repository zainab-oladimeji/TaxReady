import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { captureError } from "@/lib/monitoring";
import { getOrCreateBusinessForUser, createImportJob } from "@/lib/db/repositories";
import { enqueueExtractPdfChunk, isQStashConfigured } from "@/lib/jobs/qstash";
import { extractPdfText, chunkTextLines } from "@/lib/statement-import/pdf-reader";
import { isStatementBase64WithinSizeLimit, MAX_STATEMENT_FILE_MB } from "@/lib/validation/statement";

// businessId is ALWAYS resolved from the authenticated session here —
// never accepted from the request body. See SECURITY.md.
//
// A PDF statement's total text can add up to more AI tokens than a
// free-tier provider's per-minute quota allows to process inside one
// request (see the long comment in app/api/jobs/extract-pdf-chunk for
// the math) — so unlike Excel/CSV (still handled synchronously by
// app/api/transactions/parse-statement, since that only costs one AI
// call per sheet regardless of row count), PDFs always go through this
// background pipeline: extract the text and split it into chunks here
// (fast, no AI calls), then let QStash-triggered workers
// (app/api/jobs/extract-pdf-chunk) extract AND classify each chunk on
// its own schedule, spread over however many minutes the quota actually
// requires.
//
// No overlap between chunks here (unlike the old synchronous PDF path,
// see git history) — each chunk is processed and inserted independently
// by a separate worker invocation with no shared state to de-duplicate
// against, so overlap would mean occasional duplicate transactions
// instead of occasional missed ones. A transaction whose fields happen
// to wrap across a chunk boundary is the accepted tradeoff; the "N
// section(s) couldn't be read" warning path (see PDF_CHUNK_CAP handling
// below) already sets the expectation that a PDF import may need the
// totals double-checked against the original statement.
const PDF_CHUNK_LINES = 40;
const PDF_CHUNK_CAP = 400; // generous — each chunk is now a short, independent worker call, not bound by one request's time budget

const bodySchema = z.object({
  fileName: z.string().min(1),
  base64: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!isQStashConfigured()) {
    return NextResponse.json(
      {
        error:
          "PDF import isn't available yet on this deployment. Try exporting your statement as Excel or CSV instead."
      },
      { status: 503 }
    );
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { fileName, base64 } = parsed.data;
  if (!isStatementBase64WithinSizeLimit(base64)) {
    return NextResponse.json(
      { error: `That file is too large. Please upload a statement under ${MAX_STATEMENT_FILE_MB}MB.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(base64, "base64");

  let text: string;
  try {
    text = await extractPdfText(buffer);
  } catch (err) {
    captureError("[api/transactions/import-pdf] extractPdfText failed", err);
    return NextResponse.json(
      { error: "We couldn't read this PDF. Double-check the file, or try exporting it as Excel or CSV instead." },
      { status: 422 }
    );
  }

  if (text.trim().length < 50) {
    return NextResponse.json(
      {
        error:
          "This PDF doesn't seem to contain readable text — it may be a scanned image. " +
          "Try exporting your statement as Excel or CSV instead."
      },
      { status: 422 }
    );
  }

  let chunks = chunkTextLines(text, PDF_CHUNK_LINES, 0);
  let truncated = false;
  if (chunks.length > PDF_CHUNK_CAP) {
    chunks = chunks.slice(0, PDF_CHUNK_CAP);
    truncated = true;
  }

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");

  // totalRows/processedRows count TEXT CHUNKS for a PDF job, not
  // transactions — the transaction count isn't known until extraction
  // runs. The frontend shows this as "reading/classifying N of M
  // sections" for PDF jobs specifically (see import-csv-modal.tsx).
  const job = await createImportJob(business.id, fileName, chunks.length);

  try {
    await Promise.all(
      chunks.map((textChunk) => enqueueExtractPdfChunk({ jobId: job.id, businessId: business.id, fileName, textChunk }))
    );
  } catch (err) {
    captureError("[api/transactions/import-pdf] failed to enqueue one or more chunks", err);
    return NextResponse.json(
      { jobId: job.id, totalChunks: chunks.length, warning: "Some sections failed to queue — progress may stall." },
      { status: 207 }
    );
  }

  return NextResponse.json({
    jobId: job.id,
    totalChunks: chunks.length,
    warning: truncated
      ? `This statement is very long (${chunks.length}+ sections of text) — only the first ${PDF_CHUNK_CAP} are being processed.`
      : undefined
  });
}
