# Architecture

## System overview

```
Browser (Next.js / React)
   │
   ├── Auth.js (Credentials + optional Google OAuth) ── JWT sessions
   │
   ├── middleware.ts ── protects /dashboard/*, decodes the session JWT
   │                     (no DB or bcrypt here — see "Why middleware is
   │                     special" below)
   │
   ├── Next.js API routes (Cloud Run)
   │     ├── /api/auth/[...nextauth]     → Auth.js sign-in/sign-out/session
   │     ├── /api/auth/register          → create a MongoDB user account
   │     ├── /api/business               → resolve/create the user's business
   │     ├── /api/transactions           → list, CSV import + AI classify
   │     ├── /api/transactions/[id]      → update category/status
   │     ├── /api/receipts               → list, upload + AI extract
   │     ├── /api/reports                → generate + persist a report
   │     ├── /api/ai/ask                 → AI assistant (session-scoped data)
   │     ├── /api/ai/classify            → stateless classification (demo mode)
   │     ├── /api/receipts/process       → stateless extraction (demo mode)
   │     └── /api/reports/generate       → stateless summary (demo mode)
   │
   ├── MongoDB (Atlas)  ── users, businesses, members, transactions, receipts, reports
   ├── Cloud Storage  ── receipt/invoice files (unaffected by the DB choice)
   └── Vertex AI · Gemini  ── via the AIProvider abstraction
```

## Why middleware is special

Next.js middleware runs on the **Edge Runtime**, which cannot load the
MongoDB driver or `bcryptjs` (both need Node.js APIs). `middleware.ts`
deliberately does **not** import the full `auth()` config from `auth.ts` —
that would pull in Credentials/Google providers and, transitively, the
MongoDB client. Instead it calls `getToken()` from `next-auth/jwt`
directly, which only decodes the session cookie using `AUTH_SECRET`. All
real database work happens in API routes, which run on the Node.js
runtime.

## Two data modes

**Demo mode** (`/demo` → `/dashboard?demo=1`, no session): `DataProvider`
serves a fixed, fictional dataset from `lib/data/demo-data.ts` entirely
in-memory. No MongoDB calls happen at all — the app works with zero
configuration.

**Live mode** (signed in via Auth.js): `DataProvider` fetches from
`/api/transactions` and `/api/receipts` on load, and every mutation
(`importTransactions`, `uploadReceipt`, `updateTransactionCategory`) calls
the corresponding API route, which resolves `businessId` from the verified
session server-side — never from the client — before touching MongoDB.

## MongoDB schema

```
users            { _id, email, name, passwordHash?, createdAt }
businesses       { _id, ownerId, name, type, country, currency, createdAt }
members          { _id, businessId, userId, role, email, invitedAt, status }
transactions     { _id, businessId, date, description, amount, currency,
                    type, category, subcategory?, taxRelevance?,
                    aiConfidence?, aiReason?, receiptId?, status,
                    createdAt, updatedAt }
receipts         { _id, businessId, fileName, merchant?, date?, amount?,
                    vatAmount?, currency?, category?, paymentMethod?,
                    aiConfidence?, transactionId?, storageUrl?, status,
                    createdAt }
reports          { _id, businessId, type, title, periodStart, periodEnd,
                    createdAt, summary }
```

Every document under a business carries `businessId` — see `lib/db/
repositories.ts`, where every query filters on it, and every API route
resolves that `businessId` via `getOrCreateBusinessForUser(userId, ...)`
rather than accepting one from the request. Full TypeScript types live in
`types/index.ts`; these are the same shapes used by the demo in-memory
store, so switching a component between demo and live data requires no
type changes.

**Recommended indexes** (create these before going live with real traffic):

```js
db.transactions.createIndex({ businessId: 1, date: -1 });
db.receipts.createIndex({ businessId: 1, createdAt: -1 });
db.reports.createIndex({ businessId: 1, createdAt: -1 });
db.members.createIndex({ businessId: 1, userId: 1 }, { unique: true });
db.members.createIndex({ userId: 1 });
db.users.createIndex({ email: 1 }, { unique: true });
```

## Country tax configuration

`lib/tax/country-rules.ts` exports a `CountryTaxConfig` per country
(Nigeria fully configured; Ghana, Kenya, South Africa, UK stubbed). Nothing
in the transaction, reporting, or dashboard logic special-cases "Nigeria"
directly — everything reads from the active country's config.

## AI provider abstraction

See `AI.md`. One `AIProvider` interface, two implementations
(`MockAIProvider`, `GeminiAIProvider`), one factory (`lib/ai/index.ts`)
that picks based on environment configuration — unrelated to, and
unaffected by, the database/auth choice.

## Authentication

`auth.ts` configures Auth.js v5 with a Credentials provider (bcrypt
password check against the `users` collection) and an optional Google
provider. Sessions use the **JWT strategy** — Auth.js does not support
database sessions alongside a Credentials provider, so both auth methods
share one JWT-based session, and both write to the same `users` collection
(Google sign-ins are upserted via the `signIn` callback in `auth.ts`).

## Project structure

```
taxready/
├── app/
│   ├── (marketing landing page at /)
│   ├── dashboard/            # authenticated app (overview, transactions, receipts, ...)
│   ├── auth/                 # sign-in / sign-up
│   ├── demo/                 # redirects into the dashboard with ?demo=1
│   └── api/
│       ├── auth/              # Auth.js handler + registration
│       ├── business/          # resolve/create the session's business
│       ├── transactions/      # list, import, update
│       ├── receipts/          # list, upload + extract
│       ├── reports/           # generate + persist
│       └── ai/                # stateless AI endpoints used by demo mode
├── auth.ts                    # Auth.js v5 configuration
├── middleware.ts               # dashboard route protection (Edge-safe)
├── components/
│   ├── ui/                    # Button, Card, Badge, ReadinessRing
│   ├── marketing/               # landing page sections
│   ├── dashboard/               # sidebar, topbar, tables, uploaders
│   └── providers/                # DataProvider (demo vs. live), SessionProvider
├── lib/
│   ├── ai/                     # AIProvider interface + Mock/Gemini implementations
│   ├── auth/                    # user repository (bcrypt) + client-side auth helpers
│   ├── db/                      # MongoDB connection + typed repositories
│   ├── tax/                     # country tax rules engine
│   ├── data/                    # demo dataset generator
│   ├── readiness.ts              # Compliance Readiness Score calculation
│   └── format.ts
├── types/                     # shared TypeScript domain types
└── docs (README.md, ARCHITECTURE.md, AI.md, SECURITY.md, DEPLOYMENT.md)
```
