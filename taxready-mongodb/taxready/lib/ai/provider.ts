import {
  Anomaly,
  ClassificationResult,
  FinancialContext,
  AIResponse,
  ReceiptExtraction,
  PeriodSummary,
  Transaction
} from "@/types";
import { CountryTaxConfig } from "@/types";

/**
 * Every AI capability in TaxReady goes through this interface.
 * - GeminiAIProvider (gemini-provider.ts) calls Vertex AI Gemini in production.
 * - MockAIProvider (mock-provider.ts) runs fully offline with deterministic,
 *   explainable heuristics so the app is demoable without Google Cloud credentials.
 *
 * Nothing in app/ or components/ should import a concrete provider directly —
 * always go through getAIProvider() in lib/ai/index.ts.
 */
export interface AIProvider {
  readonly name: "gemini" | "groq" | "mock";

  classifyTransaction(
    transaction: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">,
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult>;

  /**
   * Classify many transactions in a single AI call instead of one call per
   * row. Always prefer this over calling classifyTransaction in a loop for
   * bulk imports — it cuts API usage (and free-tier quota consumption) by
   * roughly the batch size, and it's faster since it's one round trip
   * instead of N parallel ones. Results are returned in the same order as
   * the input array — implementations must preserve order even though the
   * model returns a JSON array.
   */
  classifyTransactionsBatch(
    transactions: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">[],
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult[]>;

  extractReceipt(input: { fileName: string; mimeType: string; base64?: string }): Promise<ReceiptExtraction>;

  summarizePeriod(context: FinancialContext, periodLabel: string): Promise<PeriodSummary>;

  detectAnomalies(context: FinancialContext): Promise<Anomaly[]>;

  answerQuestion(question: string, context: FinancialContext): Promise<AIResponse>;
}

export const COMPLIANCE_DISCLAIMER =
  "I can help organize and summarize your records, but this should be reviewed with a qualified tax professional.";
