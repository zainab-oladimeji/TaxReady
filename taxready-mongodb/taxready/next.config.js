const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
};

// withSentryConfig is safe to apply even with no Sentry project set up yet
// (SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN unset) — it just skips
// source map upload with a build-time notice instead of failing the build.
// Runtime error capture (sentry.*.config.ts) works independently of this.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  disableLogger: true
});
