# Security

## Authentication

- Auth.js v5 (`auth.ts`): Credentials provider (email/password, bcrypt-
  hashed, 10 salt rounds) and an optional Google OAuth provider. Sessions
  use the JWT strategy.
- `lib/auth/index.ts` centralizes every client-side auth call — components
  call `signInWithEmail`, `signInWithGoogle`, `signUpWithEmail`,
  `signOutUser` from there rather than calling `next-auth/react` directly.
- `lib/auth/users.ts` centralizes every server-side user operation
  (`findUserByEmail`, `createUserWithPassword`, `upsertOAuthUser`,
  `verifyPassword`) against the `users` MongoDB collection.
- `middleware.ts` protects every `/dashboard/*` route, redirecting to
  `/auth/sign-in` when there's no valid session JWT — except when the
  request carries `?demo=1`, which is the only sanctioned way to reach the
  dashboard without an account (see "Demo mode," below).

## Authorization

Every business-scoped MongoDB read/write resolves its `businessId`
**server-side**, from the verified session — never from a value the client
sends. The pattern, used consistently across every API route in
`app/api/{business,transactions,receipts,reports}/*`:

```ts
const session = await auth();
if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

const userId = (session.user as { id: string }).id;
const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
// business.id is now trusted — use it, never a client-supplied businessId
```

`getOrCreateBusinessForUser` (`lib/db/repositories.ts`) looks up the
caller's membership record before returning a business, so a user can
never read or write another business's data by guessing or supplying an
ID.

**This closed a real gap from the app's earlier design**: the `/api/ai/ask`
route originally accepted `businessId` and the caller's transactions
directly from the request body. It now resolves both from the session for
any signed-in user; the client-supplied version is only ever used in demo
mode, which has no real financial data to protect in the first place.

## Demo mode

`/demo` → `/dashboard?demo=1` is the one intentional way to view the
dashboard without a session. It is wired to serve **only** the fixed,
fictional in-memory dataset (`lib/data/demo-data.ts`) — `DataProvider`
never calls a MongoDB-backed API route when there's no session, regardless
of the `?demo=1` flag, so there is no path from an unauthenticated request
to real business data.

## API security

- Every mutating API route validates its request body with a `zod` schema
  before doing anything else.
- Passwords are hashed with `bcryptjs` before ever touching MongoDB — the
  plaintext password is never stored or logged.
- Gemini/Vertex AI credentials are resolved server-side only (Application
  Default Credentials) — never an API key in frontend code, and
  `GeminiAIProvider` is only ever dynamically imported from server code.
- Errors are logged server-side; raw stack traces are never returned to
  the client.
- Rate limiting should be added at the Cloud Run / API gateway layer for
  production traffic — nothing in this repo currently rate-limits
  `/api/auth/register` or the AI endpoints, which is worth doing before
  handling real signups at any volume.

## MongoDB security

- Use MongoDB Atlas's built-in encryption at rest, and enforce TLS for all
  connections (Atlas does this by default; self-hosted deployments must
  configure it explicitly).
- Restrict network access to your Atlas cluster to Cloud Run's egress IPs
  or use Atlas's VPC peering / Private Endpoint options rather than
  allow-listing `0.0.0.0/0`.
- Create a database user scoped to the `taxready` database only, with
  read/write (not admin) privileges, for the application's connection
  string.
- Never commit `MONGODB_URI` — it contains credentials. Store it in Secret
  Manager for production (see `DEPLOYMENT.md`).

## Privacy

- Data ownership: users can export or delete their data (`Settings` page).
- Account, business, and document deletion should be first-class actions,
  not afterthoughts — the current Settings page has the UI for this; wire
  the delete actions to real MongoDB deletes before relying on it in
  production.
- AI processing is scoped per business: `answerQuestion` and
  `summarizePeriod` only ever receive the authenticated caller's own
  `FinancialContext` — **one business's financial data is never used as
  context for another business's AI requests**, enforced by always
  resolving `businessId` from the session before loading data to pass to
  the AI provider.
- Audit logs should record key actions (classification overrides, report
  generation, member invitations) via Cloud Logging.

## Client-side safeguards

- No Gemini API keys, MongoDB credentials, or Auth.js secrets ever ship to
  the browser. `AUTH_SECRET` and `MONGODB_URI` are server-only environment
  variables — nothing in `app/` reads them from client components.
- The Vertex AI SDK (`@google-cloud/vertexai`) is only ever dynamically
  imported from `lib/ai/index.ts` when running server-side, so it's never
  bundled into client-side JavaScript.
