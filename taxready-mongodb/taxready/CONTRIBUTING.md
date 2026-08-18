# Contributing

## Getting started

```bash
npm install
npm run dev
```

`/` and `/demo` work with no environment variables. For live accounts
(real sign-up, real data), copy `.env.example` to `.env.local` and set at
least `MONGODB_URI` and `AUTH_SECRET`.

## Before opening a PR

```bash
npm run lint
npm run test
npm run build
```

## Conventions

- **Never** import `GeminiAIProvider` from a client component — server-side
  only, via the dynamic import in `lib/ai/index.ts`.
- **Never** import `auth.ts` (or anything from `lib/db/`) from
  `middleware.ts` — it runs on the Edge Runtime, which can't load the
  MongoDB driver or bcrypt. Middleware should only ever use
  `getToken()` from `next-auth/jwt`.
- **Never** hard-code Nigeria-specific logic — read from the active
  `CountryTaxConfig` (`lib/tax/country-rules.ts`) instead, so the app stays
  ready to expand to Ghana, Kenya, South Africa, and the UK.
- **Never** trust a `businessId` from the client in an API route — resolve
  it from the verified session via `getOrCreateBusinessForUser(userId, ...)`
  instead (see `SECURITY.md`).
- Keep AI output validated before it's stored or displayed — see the
  `parseJsonResponse` pattern in `lib/ai/gemini-provider.ts`.
- Match the product's own language rules (see `AI.md` → "Product
  language") — no claims of guaranteed compliance or definitive tax
  determinations, anywhere in the UI or copy.
- New MongoDB collections or fields should be added to `lib/db/
  repositories.ts` and `types/index.ts` together, and reflected in
  `ARCHITECTURE.md`'s schema section.
