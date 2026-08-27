/**
 * Runs `fn` over `items` with at most `concurrency` in flight at once,
 * preserving input order in the returned array regardless of completion
 * order. Used for PDF statement chunk extraction (see
 * app/api/transactions/parse-statement/route.ts) where firing every chunk
 * at the AI provider simultaneously — a bank statement PDF can produce
 * over a hundred chunks — risks hitting the provider's rate limit and
 * failing chunks that would have succeeded with a moment's spacing.
 */
export async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
