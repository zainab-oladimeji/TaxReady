import * as Sentry from "@sentry/nextjs";

/**
 * Use this instead of a bare console.error for anything caught in an API
 * route's catch block. Keeps the console.error (still useful when reading
 * Vercel's live logs directly, like we did while debugging the AI
 * provider earlier) but also reports to Sentry so it surfaces without you
 * needing to be watching logs at the moment it happens.
 *
 * No-ops safely (falls through to console.error only) if SENTRY_DSN isn't
 * configured — see sentry.server.config.ts.
 */
export function captureError(context: string, error: unknown): void {
  console.error(context, error);
  Sentry.captureException(error, { tags: { context } });
}
