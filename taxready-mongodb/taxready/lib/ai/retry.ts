/**
 * Wraps a single async call with a few retries and short exponential
 * backoff. Built for AI provider calls (receipt extraction, in
 * particular), which fail transiently often enough to be worth one or two
 * automatic retries — a dropped connection, a provider's brief hiccup — 
 * before giving up and surfacing an error to the user.
 *
 * Deliberately simple: it retries on ANY thrown error, without trying to
 * distinguish "worth retrying" (timeout, 5xx, network) from "will never
 * succeed" (invalid API key, malformed request). Distinguishing those
 * reliably would mean coupling this helper to each provider's specific
 * error shapes (Gemini vs Groq throw differently-shaped errors — see
 * lib/ai/gemini-api-provider.ts vs lib/ai/groq-provider.ts). A wasted
 * retry costs a few hundred milliseconds; that's a fine trade for staying
 * provider-agnostic. If a specific error class turns out to dominate
 * Sentry's logs as "retried and failed anyway," that's the signal to add
 * real error-type detection — not something to guess at up front.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; baseDelayMs?: number }
): Promise<T> {
  const retries = options?.retries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 400;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
