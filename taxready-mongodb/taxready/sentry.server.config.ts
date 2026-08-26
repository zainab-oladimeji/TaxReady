import * as Sentry from "@sentry/nextjs";

// No-op automatically when SENTRY_DSN is unset — same reasoning as
// sentry.client.config.ts.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0
});
