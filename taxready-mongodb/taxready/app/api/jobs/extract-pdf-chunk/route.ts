import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { z } from "zod";
import { captureError } from "@/lib/monitoring";
import { getAIProvider } from "@/lib/ai";
import { getCountryTaxConfig } from "@/lib/tax/country-rules";
import { advanceImportJob, getBusinessById, insertClassifiedTransactions } from "@/lib/db/repositories";

/**
 * Background worker for one text chunk of a PDF bank statement import
 * (see app/api/transactions/import-pdf and lib/jobs/qstash.ts for the
 * full flow). Called by QStash itself — never by the browser — so there
 * is no user session here. verifySignatureAppRouter stands in for auth.
 *
 * Unlike the CSV/Excel pipeline (app/api/jobs/classify-chunk), where the
 * transactions are already known and only need classifying, a PDF chunk
 * is raw text — this worker does BOTH steps for its chunk: extract
 * transactions from the text, then classify whatever it found, then
 * insert them as finished transactions in one shot. There's no
 * intermediate "queued" row, because until extraction runs there's
 * nothing to queue.
 *
 * WHY THIS IS A SEPARATE BACKGROUND WORKER AND NOT PART OF THE
 * SYNCHRONOUS parse-statement ROUTE: a large statement's PDF text adds
 * up to more total AI tokens than a free-tier provider's per-minute quota
 * allows to process in the ~5 minutes any single Vercel function is
 * allowed to run, no matter how the calls inside that one request are
 * paced — the ceiling is on total throughput over time, not on how
 * politely one request waits between calls. Splitting each chunk into
 * its own short-lived, independently-retried QStash invocation (like
 * classify-chunk already does) is what actually lets the work spread
 * across as many minutes as the quota requires, instead of needing to
 * fit inside one function's execution window.
 *
 * A chunk that fails here (including from a 429 rate-limit response)
 * throws rather than being caught — that turns into a non-2xx response,
 * which tells QStash to retry the WHOLE message later, spaced out by
 * QStash's own backoff. That's what actually resolves a per-minute quota
 * problem; retrying in a loop inside this same invocation would just
 * burn the invocation's own time budget waiting out a window it can't
 * fit inside anyway.
 */

const chunkSchema = z.object({
  jobId: z.string(),
  businessId: z.string(),
  fileName: z.string(),
  textChunk: z.string().min(1)
});

async function handler(request: Request): Promise<Response> {
  const json = await request.json();
  const parsed = chunkSchema.safeParse(json);
  if (!parsed.success) {
    // Don't retry a malformed payload — it'll never succeed. Returning 200
    // (rather than 4xx/5xx) tells QStash the delivery is done, not failed.
    captureError("[jobs/extract-pdf-chunk] invalid payload, dropping", parsed.error);
    return NextResponse.json({ ok: false, reason: "invalid payload" });
  }

  const { jobId, businessId, fileName, textChunk } = parsed.data;

  const business = await getBusinessById(businessId);
  if (!business) {
    captureError("[jobs/extract-pdf-chunk] business not found, dropping", new Error(businessId));
    return NextResponse.json({ ok: false, reason: "business not found" });
  }

  const provider = await getAIProvider();

  // Let a failure here throw — see the file-level comment on why this
  // must NOT be caught and swallowed. QStash's retry (see
  // enqueueExtractPdfChunk's `retries: 5`) is what actually recovers a
  // rate-limited chunk.
  const extracted = await provider.extractStatementTransactionsFromText(textChunk, { fileName });

  if (extracted.length === 0) {
    // A perfectly normal outcome for a chunk with no transactions in it
    // (a cover page, a summary section) — one chunk of the PDF is done
    // either way.
    await advanceImportJob(jobId, 1, 0);
    return NextResponse.json({ ok: true, extracted: 0 });
  }

  const taxConfig = getCountryTaxConfig(business.country);

  // classifyTransactionsBatch already chunks/retries/falls back internally
  // (lib/ai/robust-batch.ts) for the classification step specifically.
  const results = await provider.classifyTransactionsBatch(
    extracted.map((row) => ({ description: row.description, amount: row.amount, type: row.type, currency: business.currency })),
    taxConfig
  );

  let reviewCount = 0;
  const rowsToInsert = extracted.map((row, i) => {
    const result = results[i];
    if (result.requiresReview) reviewCount += 1;
    return {
      date: row.date,
      description: row.description,
      amount: row.amount,
      currency: business.currency,
      type: row.type,
      category: result.category,
      subcategory: result.subcategory,
      taxRelevance: result.taxRelevance,
      aiConfidence: result.confidence,
      aiReason: result.reason,
      status: (result.requiresReview ? "flagged" : "reviewed") as "flagged" | "reviewed"
    };
  });

  await insertClassifiedTransactions(businessId, jobId, rowsToInsert);
  // processedRows counts CHUNKS for a PDF job (unlike the CSV/Excel
  // pipeline, where it counts transactions) — see the ImportJob progress
  // note in app/api/transactions/import-pdf/route.ts for why. reviewRows
  // stays transaction-level in both pipelines.
  await advanceImportJob(jobId, 1, reviewCount);

  return NextResponse.json({ ok: true, extracted: extracted.length });
}

export const POST = verifySignatureAppRouter(handler);

// Extraction + classification for one chunk, comfortably under a minute
// — give it real headroom rather than relying on the platform default.
export const maxDuration = 60;
