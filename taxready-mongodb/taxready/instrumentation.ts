import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Catches errors thrown inside Next.js's own request handling (not just
// ones we explicitly catch in a try/catch) — e.g. a route handler that
// throws without a try/catch, or a rendering error during SSR.
export const onRequestError = Sentry.captureRequestError;
