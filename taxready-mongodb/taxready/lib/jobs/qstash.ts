import { Client } from "@upstash/qstash";
import { appBaseUrl } from "@/lib/email/send";

/**
 * Background job processing for bulk transaction imports (see
 * app/api/transactions/import and app/api/jobs/classify-chunk).
 *
 * Vercel serverless functions have a hard execution timeout (your dashboard
 * showed a 5 minute max on the failed request that started this fix), so a
 * large import can't be classified inside one request/response cycle.
 * Instead:
 *
 *   1. app/api/transactions/import saves every row immediately (status
 *      "queued") and responds right away — no AI calls happen inline.
 *   2. It then publishes one QStash message per ~20-row chunk to
 *      /api/jobs/classify-chunk.
 *   3. QStash calls that route back (HTTP, signed, verifiable) for each
 *      chunk, on its own schedule, each well within the timeout. Failed
 *      deliveries are retried by QStash itself.
 *   4. The frontend polls /api/transactions/import/[jobId] for progress.
 *
 * Needs two things in the environment (see .env.example):
 *   QSTASH_TOKEN                 — to publish messages
 *   QSTASH_CURRENT_SIGNING_KEY   — to verify inbound requests are really
 *   QSTASH_NEXT_SIGNING_KEY        from QStash (see verifySignatureAppRouter
 *                                   in app/api/jobs/classify-chunk/route.ts)
 * Get all three from the "Request Builder" / "Signing Keys" tabs of a free
 * QStash project at https://console.upstash.com/qstash — no credit card
 * required for the free tier, which is generous enough for this use case.
 */
export function isQStashConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN);
}

let client: Client | null = null;
function getClient(): Client {
  if (!client) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) throw new Error("QSTASH_TOKEN is not set — see lib/jobs/qstash.ts for setup.");
    client = new Client({ token });
  }
  return client;
}

export async function enqueueClassifyChunk(payload: {
  jobId: string;
  businessId: string;
  chunk: { id: string; description: string; amount: number; type: "income" | "expense"; currency: string }[];
}): Promise<void> {
  await getClient().publishJSON({
    url: `${appBaseUrl()}/api/jobs/classify-chunk`,
    body: payload,
    // Chunk workers are idempotent-ish (advanceImportJob only ever adds
    // progress, never re-processes on its own), but a handful of automatic
    // retries on transient failures is still exactly what we want here.
    retries: 3,
    // Caps how many classify-chunk invocations QStash runs at once across
    // ALL imports (same key = shared limit). Every concurrent invocation
    // is a separate Vercel function instance opening its own MongoDB
    // connection pool (see lib/db/mongodb.ts) — on an Atlas M0 cluster's
    // 500-connection cap, uncapped parallelism from a large import is
    // exactly what triggered a "nearing maximum connections" alert in
    // production. This is a second layer of protection on top of the
    // small per-instance pool size in mongodb.ts, not a replacement for
    // it — Vercel's own concurrent-invocation limit and any other traffic
    // hitting the DB aren't bounded by this.
    flowControl: { key: "ai-provider-calls", parallelism: 10 }
  });
}

export async function enqueueExtractPdfChunk(payload: {
  jobId: string;
  businessId: string;
  fileName: string;
  textChunk: string;
}): Promise<void> {
  await getClient().publishJSON({
    url: `${appBaseUrl()}/api/jobs/extract-pdf-chunk`,
    body: payload,
    // A PDF text chunk can genuinely fail its first few attempts if the
    // AI provider's per-minute quota is exhausted (see the long comment
    // in app/api/jobs/extract-pdf-chunk/route.ts) — this is expected and
    // recoverable, not a sign the chunk is unprocessable. QStash spaces
    // retries out with its own backoff BETWEEN separate, short-lived
    // invocations, which is what actually resolves a per-minute quota
    // limit; retrying inside one long-running function (the original,
    // broken approach) can't wait out a 60-second window without risking
    // that function's own execution timeout. More retries than
    // classify-chunk's because quota exhaustion here is the norm for a
    // large statement, not the exception.
    retries: 5,
    // Shares one flow-control key with classify-chunk (see above) so the
    // two pipelines' concurrent AI calls are bounded together, not each
    // given an independent budget that can stack on top of the other —
    // a PDF import and a CSV/Excel import running at the same time
    // shouldn't be able to double the effective concurrency against the
    // AI provider's quota.
    flowControl: { key: "ai-provider-calls", parallelism: 10 }
  });
}
