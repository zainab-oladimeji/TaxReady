import * as Sentry from "@sentry/nextjs";

// No-op automatically when NEXT_PUBLIC_SENTRY_DSN is unset (e.g. local
// dev, or before you've created a Sentry project) — Sentry.init() with an
// undefined dsn just doesn't send anything, it doesn't throw.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Session Replay adds real diagnostic value for a small app's traffic
  // volume at near-zero cost — 10% of normal sessions, but ALL sessions
  // that actually error, so you can see what the user was doing.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()]
});
