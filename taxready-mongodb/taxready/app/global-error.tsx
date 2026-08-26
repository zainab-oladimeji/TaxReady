"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Catches errors that escape every other error boundary — the last resort
 * for unhandled client-side exceptions. Next.js requires this file to
 * define its own <html>/<body> since it replaces the entire root layout
 * when it triggers, so it deliberately doesn't depend on globals.css or
 * the font setup in app/layout.tsx (those may be exactly what's broken).
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { digest: error.digest } });
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "sans-serif", padding: "48px", textAlign: "center", color: "#1a1a1a" }}>
        <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Something went wrong</h1>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
          We&apos;ve been notified and are looking into it.
          {error.digest && ` Reference: ${error.digest}`}
        </p>
        <button
          onClick={reset}
          style={{
            background: "#111",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer"
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
