import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { z } from "zod";
import { captureError } from "@/lib/monitoring";
import { getAIProvider } from "@/lib/ai";
import { getCountryTaxConfig } from "@/lib/tax/country-rules";
import { advanceImportJob, getBusinessById, updateTransaction } from "@/lib/db/repositories";

/**
 * Background worker for one chunk of a bulk import (see
 * app/api/transactions/import and lib/jobs/qstash.ts for the full flow).
 * Called by QStash itself — never by the browser — so there is no user
 * session here. verifySignatureAppRouter below is what stands in for auth:
 * it rejects any request that isn't signed with this project's QStash
 * signing keys, so this route can't be triggered by an arbitrary POST.
 */

const chunkSchema = z.object({
  jobId: z.string(),
  businessId: z.string(),
  chunk: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      amount: z.number(),
      type: z.enum(["income", "expense"]),
      currency: z.string()
    })
  ).min(1)
});

async function handler(request: Request): Promise<Response> {
  const json = await request.json();
  const parsed = chunkSchema.safeParse(json);
  if (!parsed.success) {
    // Don't retry a malformed payload — it'll never succeed. Returning 200
    // (rather than 4xx/5xx) tells QStash the delivery is done, not failed.
    captureError("[jobs/classify-chunk] invalid payload, dropping", parsed.error);
    return NextResponse.json({ ok: false, reason: "invalid payload" });
  }

  const { jobId, businessId, chunk } = parsed.data;

  const business = await getBusinessById(businessId);
  if (!business) {
    captureError("[jobs/classify-chunk] business not found, dropping", new Error(businessId));
    return NextResponse.json({ ok: false, reason: "business not found" });
  }

  const taxConfig = getCountryTaxConfig(business.country);
  const provider = await getAIProvider();

  // classifyTransactionsBatch already chunks/retries/falls back internally
  // (lib/ai/robust-batch.ts) — this chunk is small (~20) so that mostly
  // just adds retry safety on top of what's already a small, fast call.
  const results = await provider.classifyTransactionsBatch(
    chunk.map((row) => ({ description: row.description, amount: row.amount, type: row.type, currency: row.currency })),
    taxConfig
  );

  let reviewCount = 0;
  await Promise.all(
    chunk.map((row, i) => {
      const result = results[i];
      if (result.requiresReview) reviewCount += 1;
      return updateTransaction(businessId, row.id, {
        category: result.category,
        subcategory: result.subcategory,
        taxRelevance: result.taxRelevance,
        aiConfidence: result.confidence,
        aiReason: result.reason,
        status: result.requiresReview ? "flagged" : "reviewed"
      });
    })
  );

  await advanceImportJob(jobId, chunk.length, reviewCount);

  return NextResponse.json({ ok: true, processed: chunk.length });
}

export const POST = verifySignatureAppRouter(handler);

// Chunk classification calls an external AI API and writes several DB
// rows — comfortably under a minute, but give it real headroom rather
// than relying on the platform default.
export const maxDuration = 60;
