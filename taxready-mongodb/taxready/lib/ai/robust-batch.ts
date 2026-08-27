import { ClassificationResult, Transaction } from "@/types";

export type ClassifiableTxn = Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">;

/**
 * Shared retry/chunking logic for AIProvider.classifyTransactionsBatch
 * implementations. Every provider (Groq, Gemini, ...) has the same failure
 * mode: the model is asked to classify N transactions in one call and
 * occasionally returns fewer (or more) than N results — usually because a
 * large JSON array got truncated or merged somewhere in generation. Calling
 * this out and refusing to trust the misaligned output (see each provider's
 * raw batch call) is correct, but previously that error propagated all the
 * way up and failed the entire import — including transactions the model
 * classified just fine.
 *
 * This wraps a provider's raw batch call with:
 *  1. Chunking — split large imports into CHUNK_SIZE-sized calls instead of
 *     one huge call. Smaller arrays are far less likely to come back
 *     misaligned, and it keeps each individual call fast.
 *  2. Retries — a misaligned or failed chunk is retried a few times before
 *     giving up on it, since these mismatches are often transient.
 *  3. Adaptive splitting — a chunk that still won't classify cleanly is
 *     split in half and each half is retried independently, isolating
 *     whichever transaction(s) are actually causing trouble instead of
 *     failing the whole batch.
 *  4. Graceful, per-transaction fallback — a single transaction that still
 *     can't be classified after all of the above gets a safe "needs
 *     manual review" result instead of throwing and losing the entire
 *     import. The transaction itself is never dropped.
 *
 * Every provider should route its classifyTransactionsBatch through this
 * instead of calling the model directly on the full input array.
 */
const CHUNK_SIZE = 20;
const MAX_RETRIES_PER_CHUNK = 2;

export async function classifyInRobustBatches(
  transactions: ClassifiableTxn[],
  rawBatchCall: (batch: ClassifiableTxn[]) => Promise<ClassificationResult[]>
): Promise<ClassificationResult[]> {
  if (transactions.length === 0) return [];

  const chunks: ClassifiableTxn[][] = [];
  for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
    chunks.push(transactions.slice(i, i + CHUNK_SIZE));
  }

  const chunkResults = await Promise.all(chunks.map((chunk) => classifyChunk(chunk, rawBatchCall)));
  return chunkResults.flat();
}

async function classifyChunk(
  chunk: ClassifiableTxn[],
  rawBatchCall: (batch: ClassifiableTxn[]) => Promise<ClassificationResult[]>
): Promise<ClassificationResult[]> {
  for (let attempt = 0; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
    try {
      const results = await rawBatchCall(chunk);
      if (Array.isArray(results) && results.length === chunk.length) {
        return results;
      }
    } catch {
      // Swallow and retry — a fresh call to the model often just works.
    }
  }

  if (chunk.length === 1) {
    // Nothing left to split. This one transaction genuinely can't be
    // classified right now — don't let it take the whole import down.
    return [needsReviewFallback(chunk[0])];
  }

  const mid = Math.ceil(chunk.length / 2);
  const [left, right] = await Promise.all([
    classifyChunk(chunk.slice(0, mid), rawBatchCall),
    classifyChunk(chunk.slice(mid), rawBatchCall)
  ]);
  return [...left, ...right];
}

function needsReviewFallback(txn: ClassifiableTxn): ClassificationResult {
  return {
    category: "Uncategorized",
    taxRelevance: "review_required",
    confidence: 0,
    reason: `AI classification could not be completed for "${txn.description}" after retries — please categorize manually.`,
    requiresReview: true
  };
}
