/**
 * A minimal in-memory rate limiter, keyed per Vercel serverless instance.
 *
 * IMPORTANT LIMITATION: this does NOT share state across separate
 * serverless function instances. Vercel can (and will, under real load or
 * across regions) route requests to multiple warm instances, each with
 * its own copy of this Map — so a determined attacker distributing
 * requests could see a higher effective limit than the numbers below
 * suggest. This still meaningfully raises the cost of casual credential
 * stuffing / signup spam from a single source, which is what matters for
 * a small app's threat model right now.
 *
 * When real traffic justifies it, replace this with Vercel KV or Upstash
 * Redis (both have free tiers) for a limiter that's correct across
 * instances — same call signature, so call sites here won't need to
 * change, only this file's internals.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically forget old buckets so this Map doesn't grow forever within
// a single long-lived warm instance.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  },
  10 * 60 * 1000
).unref?.();

/**
 * Returns true if the request is allowed, false if it should be rejected.
 * `key` should combine the route name and an identifier (IP, email) so
 * different endpoints/identities don't share a budget.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

/** Best-effort client IP extraction behind Vercel's proxy. */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
