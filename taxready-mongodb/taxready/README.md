# TaxReady

**Turn business transactions into tax-ready records.**

TaxReady is an AI-native compliance preparation platform that helps African
SMEs transform messy transactions, receipts, and financial records into
structured, tax-ready information for professional review.

TaxReady is **not** an accounting replacement, a tax filing platform, a tax
authority, or an automated tax advisor. It's the layer between everyday
business activity and a qualified accountant.

## What's in this repo

A working Next.js 14 (App Router, TypeScript) application:

- **Marketing site** (`/`) — the full landing page: hero, problem/solution,
  AI section, an interactive receipt-extraction demo, the Compliance
  Readiness Score explainer, the Google Cloud AI + MongoDB architecture
  story, pricing, and security.
- **Demo mode** (`/demo` → `/dashboard?demo=1`) — drops straight into a
  fully populated dashboard with realistic fictional Nigerian SME data
  (1,248 transactions, 438 receipts, an 82% readiness score) — no sign-up,
  no database required.
- **Authenticated dashboard** (`/dashboard/*`) — real accounts, backed by
  MongoDB: overview, transaction management (search/filter/sort/pagination
  /bulk actions), CSV import with live AI categorization, receipt upload
  with AI extraction, tax readiness breakdown, report generation, an "Ask
  TaxReady" AI assistant, a multi-business switcher, an accountant
  dashboard, and settings.
- **AI provider abstraction** (`lib/ai/`) — a `MockAIProvider` (default,
  works with zero credentials) and a `GeminiAIProvider` (production, calls
  Vertex AI Gemini) behind one `AIProvider` interface. See `AI.md`.
- **Country-configurable tax engine** (`lib/tax/country-rules.ts`) — Nigeria
  is fully configured; Ghana, Kenya, South Africa, and the UK are stubbed for
  expansion. Nothing in the app hard-codes Nigeria-specific logic.
- **MongoDB data layer** (`lib/db/`) — a lazily-connected MongoDB client and
  typed repositories for businesses, transactions, receipts, and reports,
  every read/write scoped server-side to the authenticated user's business.
- **Auth.js (NextAuth v5) authentication** (`auth.ts`, `lib/auth/`) — Google
  Sign-In and email/password (bcrypt-hashed, stored in MongoDB), JWT
  sessions, dashboard routes protected by `middleware.ts`.

## Two modes, one codebase

- **Demo mode** (`/demo`): no sign-up, no database. Everything runs
  in-memory against a fixed fictional dataset — safe to show anyone, and
  works with zero configuration beyond `npm install && npm run dev`.
- **Live mode** (sign up / sign in): real accounts, real data, all
  persisted to MongoDB and scoped per-business. Requires `MONGODB_URI` and
  `AUTH_SECRET` at minimum (see `.env.example`).

AI works the same way in both: `MockAIProvider` by default (deterministic,
offline), or real Vertex AI Gemini the moment `VERTEX_AI_PROJECT_ID` and
`GOOGLE_CLOUD_PROJECT_ID` are set — no code changes needed either way.

## Local development

```bash
npm install
npm run dev       # http://localhost:3000
npm run lint
npm run test
npm run build
```

`/` and `/demo` work immediately with no environment variables at all.
For live accounts, copy `.env.example` to `.env.local` and set at least:

```bash
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=...     # generate with: npx auth secret
```

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design, MongoDB schema, data flow
- [`AI.md`](./AI.md) — AI provider architecture, prompting, and safety rules
- [`SECURITY.md`](./SECURITY.md) — auth, authorization, and privacy
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — deploying to Google Cloud Run + MongoDB Atlas

## Technologies used

| Technology | Role |
|---|---|
| Vertex AI · Gemini | Transaction classification, receipt extraction, AI assistant, summaries |
| Cloud Run | Hosts the Next.js app and API routes |
| MongoDB (Atlas) | Accounts, businesses, transactions, receipts, reports — one database |
| Auth.js (NextAuth v5) | Google Sign-In and email/password authentication |
| Cloud Storage | Receipt and invoice file storage |
| Secret Manager | Production environment secrets |
| Cloud Logging / Monitoring | Observability for API, AI, and auth failures |
| Google Drive / Sheets | Roadmap — future document ingestion and export |

## Roadmap

**Now (MVP):** landing page, MongoDB-backed accounts, business creation,
dashboard, CSV import, AI categorization, receipt upload + extraction,
transaction review, readiness score, report generation, demo mode.

**Next:** AI assistant refinements, accountant workflows, multi-business
polish, Excel/PDF export, bank integrations.

**Later:** Ghana/Kenya/South Africa tax configurations, UK expansion,
Google Drive/Sheets/Gmail integrations, payments, mobile app.

## Product language

TaxReady is careful never to overstate what it does. See `AI.md` and
`SECURITY.md` for the exact language used throughout the product — in
short: TaxReady **prepares and organizes** records; it does not guarantee
compliance, determine tax liability, or replace an accountant.
