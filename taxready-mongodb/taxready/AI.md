# AI Architecture

## Principle

AI is used where it solves a real problem, not because this is "an AI
app." TaxReady's six AI capabilities:

1. **Understanding** — parse messy, unstructured financial information.
2. **Classification** — categorize transactions.
3. **Extraction** — pull structured data out of receipts and invoices.
4. **Reasoning** — flag records that need human review.
5. **Summarization** — explain a period's financial activity in plain language.
6. **Conversational interaction** — answer questions about the user's own data.

## Provider abstraction

```ts
interface AIProvider {
  classifyTransaction(transaction, taxConfig): Promise<ClassificationResult>;
  extractReceipt(document): Promise<ReceiptExtraction>;
  summarizePeriod(context, periodLabel): Promise<PeriodSummary>;
  detectAnomalies(context): Promise<Anomaly[]>;
  answerQuestion(question, context): Promise<AIResponse>;
}
```

- **`MockAIProvider`** (`lib/ai/mock-provider.ts`) — deterministic,
  keyword-based heuristics. No network calls, no credentials. This is what
  runs by default, including in the hosted demo.
- **`GeminiAIProvider`** (`lib/ai/gemini-provider.ts`) — calls Vertex AI
  Gemini with a system instruction per capability, `responseMimeType:
  "application/json"`, and low temperature. Runs only server-side (API
  routes) — the Vertex AI SDK resolves Application Default Credentials, so
  no API key ever ships to the browser.
- **`getAIProvider()`** (`lib/ai/index.ts`) — the only place that decides
  which implementation to use, based on whether `VERTEX_AI_PROJECT_ID` and
  `GOOGLE_CLOUD_PROJECT_ID` are set.

## Prompting

Every Gemini system instruction follows the same shape, e.g. for
classification:

> You are a financial transaction classification assistant. Classify the
> transaction using only the provided information. Do not invent facts.
> Return JSON only. Fields: category, subcategory, taxRelevance,
> confidence, reason, requiresReview.

Structured JSON output is requested and validated (`parseJsonResponse` in
`gemini-provider.ts` throws rather than silently accepting malformed
output) — model output is never trusted or stored without validation.

## Safety rules

The AI must **never**:

- invent transaction values it wasn't given,
- fabricate tax rules,
- claim legal compliance or that a business "is tax compliant,"
- provide definitive legal advice,
- make unsupported deductions.

Every classification includes `confidence`, `reason`, and `requiresReview`
so a human can evaluate and override it — this is enforced human-in-the-loop:
**AI recommends, humans approve.**

For any legal/tax-advice-shaped question, both providers return the same
disclaimer (`COMPLIANCE_DISCLAIMER` in `lib/ai/provider.ts`):

> I can help organize and summarize your records, but this should be
> reviewed with a qualified tax professional.

## Data isolation

`answerQuestion` and `summarizePeriod` only ever receive the
`FinancialContext` (transactions + receipts) for the authenticated caller's
own business. Every API route resolves `businessId` from the verified
Auth.js session server-side — never from a value the client sends. See
`SECURITY.md`.

## Product language

The interface never says "TaxReady guarantees tax compliance" or "AI
determines your tax liability." It says "TaxReady helps businesses prepare
their financial records for tax and professional review" and "AI
identifies potentially tax-relevant transactions and areas requiring
review." The Compliance Readiness Score is labeled "record readiness," not
legal compliance, everywhere it appears.
