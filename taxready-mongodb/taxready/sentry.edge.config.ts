import * as Sentry from "@sentry/nextjs";

// Covers errors thrown inside middleware.ts, which runs on the Edge
// runtime rather than Node — a separate runtime needs its own init call.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0
});
